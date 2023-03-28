import { ErrorStruct, SuccessStruct } from "../../types/dto";
import { delay, errorStruct } from "../../util/helpers"
import { getZohoTokenDB } from "../../database/databaseServices"
//@ts-ignore
import axios, { AxiosResponse, AxiosInstance } from "axios";
import * as moment from "moment-timezone"
import { Accounts, Contacts, Leads, ModulosZoho, NomeModulosZoho } from "../../types/zoho-entidades-types"
import { isObject } from "lodash";
import { ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET } from "../../util/secrets"
//@ts-ignore
const isProd = process?.env?.NODE_ENV?.toLowerCase?.() == "prod"

const accessTokenQuantity = isProd ? 5 : 1 // in the local/test environment will only create one access token, on prod will create 5 - the limit is 10
const localAccessToken: string[] = [];
const localClientId: string | undefined = ZOHO_CLIENT_ID; // colocar aqui o client ID
const localClientSecret: string | undefined = ZOHO_CLIENT_SECRET; // colocar aqui o clientSecret
let localRefreshToken: string;
let accessTokenRenewing: boolean = false

const apiVersion = 3
// version 2 returns error in response
// version 3 returns error in catch

class ZohoApiCollection {
    #api: AxiosInstance
    readonly #giroAccessToken: () => string
    readonly #updateApiInstance: () => void
    
    constructor() {

        this.#giroAccessToken = function (): string {

            const firstToken = localAccessToken?.shift()

            if (!firstToken || typeof firstToken != 'string') return ""

            localAccessToken.push(firstToken)

            return firstToken

        }

        this.#updateApiInstance = () => {

            this.#api = axios.create({
                baseURL: `https://www.zohoapis.com/crm/v${apiVersion}/`,
                headers: {
                    Authorization: `Zoho-oauthtoken ${this.#giroAccessToken()}`,
                    Accept: "*/*",
                    "Accept-Encoding": 'application/json'
                }
            });

        }

        this.#updateApiInstance()

    }
    async renewAccessToken(): Promise<ErrorStruct | SuccessStruct> {

        const funcName = "ZohoApiCollection.renewAccessToken"

       if (!accessTokenRenewing) {

            accessTokenRenewing = true;

            while (localAccessToken?.length) localAccessToken.shift();
            
        } else {

             for (let i = 0; i < 8; i++) {
                await delay(3000)
                if (!accessTokenRenewing) break;
            }

            if (!localAccessToken?.length) {
                accessTokenRenewing = false;
                return errorStruct(funcName, "Erro ao renovar os acesstokens da fila", { localAccessToken })
            }

            accessTokenRenewing = false;

            this.#updateApiInstance()

            return { error: false }

        }
        
        if ([localRefreshToken].some((e) => !e || typeof e != 'string')) {

            const zohoTokens = await getZohoTokenDB()

            if (zohoTokens?.error) {
                accessTokenRenewing = false;
                return errorStruct(funcName, "Não foi possível consultar as credenciais da Zoho no Banco de Dados", zohoTokens)
            }

            const { refreshToken } = zohoTokens?.data || {}

            if ([refreshToken].some((e) => !e || typeof e != 'string')) {
                accessTokenRenewing = false;
                return errorStruct(funcName, "Erro nas credenciais do Zoho no Banco de Dados", zohoTokens)
            }

            localRefreshToken = refreshToken?.trim()

        }

        const getAccessTokens = await this.getAccessTokens(accessTokenQuantity)

        if (getAccessTokens?.error) {
            accessTokenRenewing = false;
            return errorStruct(funcName, getAccessTokens?.error, getAccessTokens)
        }

        this.#updateApiInstance()

        accessTokenRenewing = false;

        return { error: false }

    }

    async getAccessTokens(amount: number, tries: number = 0) {

        const { name: funcName } = this.getAccessTokens

        if (typeof amount != 'number' || amount <= 0 || amount > 10) {

            if (localAccessToken?.length) {
                return { error: false }
            }

            return errorStruct(funcName, "Erro ao gerar os novos accesstokens", { localAccessToken })

        }

        try {

            const { data } = await axios.post(`https://accounts.zoho.com/oauth/v2/token?refresh_token=${localRefreshToken}&client_id=${localClientId}&client_secret=${localClientSecret}&grant_type=refresh_token`) || {}

            const newAccessToken = data?.access_token

            if (!newAccessToken || typeof newAccessToken != 'string') {

                if (localAccessToken?.length) {
                    await delay(500)
                    return await this.getAccessTokens(amount, tries + 1)
                }

                return errorStruct(funcName, "Erro ao renovar o Access Token da Zoho.", { data })
            }

            localAccessToken.push(newAccessToken)

            await delay(500)

            return await this.getAccessTokens(amount - 1, tries)

        } catch (err) {

            const errorFix = await this.errorHandler({ err, funcName, funcVars: { amount } })

            if (typeof tries != 'number' || tries > 3 || tries < 0) {
                return errorStruct(funcName, "Limite de tentativas atingido.", { errorFix })
            }

            if (errorFix?.error) {
                return errorStruct(funcName, errorFix?.error, errorFix)
            }

            await delay(1500 * (tries || 1))
            return await this.getAccessTokens(amount, tries + 1)

        }

    }

    async createRecordOnModule(varsObj: {
        moduleName: NomeModulosZoho | string, createMap: ModulosZoho, trigger?: ("workflow" | "blueprint")[]
    },
        tries: number = 0): Promise<ErrorStruct | { error: false, data: { recordId: string } }> {

        const { name: funcName } = this.createRecordOnModule

        const { moduleName, createMap, trigger } = varsObj || {}

        if (!moduleName || typeof moduleName != 'string') {
            return errorStruct(funcName, "Nome do módulo inválido.", { moduleName })
        }

        if (!isObject(createMap)) {
            return errorStruct(funcName, "O mapa de criação está inválido", { createMap })
        }

        const data: { data: ModulosZoho[], trigger?: ("workflow" | "blueprint")[] } = {
            data: [createMap]
        }

        if (Array.isArray(trigger) && !trigger.some((e) => !["workflow", "blueprint"].includes(e))) {
            data.trigger = trigger
        }

        try {

            const { data: zohoResult, status } = await this.#api.post(`${moduleName}`, data)

            const idCreation = zohoResult?.data?.[0]?.details?.id

            if ((status != 201 && status != 200) || !idCreation) {
                return errorStruct(funcName, `Erro ao criar o ${moduleName}.`, zohoResult)
            }

            return { error: false, data: { recordId: idCreation } }

        } catch (err) {

            const errorFix = await this.errorHandler({ err, funcName, funcVars: varsObj })

            if (typeof tries != 'number' || tries > 3 || tries < 0) {
                return errorStruct(funcName, "Limite de tentativas atingido.", { errorFix })
            }

            if (errorFix?.error) {
                return errorStruct(funcName, errorFix?.error, errorFix)
            }

            if (errorFix?.data?.recordId) {
                return { error: false, data: { recordId: errorFix?.data?.recordId } }
            } // verificar se logica é possivel

            await delay(1500 * (tries || 1))
            return await this.createRecordOnModule(varsObj, tries + 1)

        }

    }

    async updateRecordByModuleAndId(varsObj: {
        moduleName: NomeModulosZoho | string, idRecord: string | number,
        updateMap: ModulosZoho, trigger?: ("workflow" | "blueprint")[]
    }, tries: number = 0): Promise<ErrorStruct | SuccessStruct> {

        const { name: funcName } = this.updateRecordByModuleAndId

        const { moduleName, updateMap, idRecord, trigger } = varsObj || {}

        if (!moduleName || typeof moduleName != 'string') {
            return errorStruct(funcName, "Nome do módulo inválido.", { moduleName })
        }

        if (!idRecord || typeof idRecord != 'string') {
            return errorStruct(funcName, "ID do Registro  inválido.", { idRecord })
        }

        if (!isObject(updateMap)) {
            return errorStruct(funcName, "O mapa de atualização está inválido", { updateMap })
        }

        const data: { data: ModulosZoho[], trigger?: ("workflow" | "blueprint")[] } = {
            data: [updateMap]
        }

        if (Array.isArray(trigger) && !trigger.some((e) => !["workflow", "blueprint"].includes(e))) {
            data.trigger = trigger
        }

        try {

            const { data: zohoResult, status } = await this.#api.put(`${moduleName}/${idRecord}`, data)

            if (status != 200) {
                return errorStruct(funcName, `Erro ao atualizar o módulo ${moduleName}`, zohoResult)
            }

            return { error: false }

        } catch (err) {

            const errorFix = await this.errorHandler({ err, funcName, funcVars: varsObj })

            if (typeof tries != 'number' || tries > 3 || tries < 0) {
                return errorStruct(funcName, "Limite de tentativas atingido.", { tries, varsObj, errorFix })
            }

            if (errorFix?.error) {
                return errorStruct(funcName, errorFix?.error, errorFix)
            }

            if (errorFix?.data?.newParams) {

                const { updateMap: newMap } = errorFix?.data?.newParams || {}

                varsObj.updateMap = newMap

                await delay(1500 & tries || 1)
                return await this.updateRecordByModuleAndId(varsObj, tries + 1)

            }

            await delay(1500 * (tries || 1))
            return await this.updateRecordByModuleAndId(varsObj, tries + 1)

        }

    }

    async getRecordByModuleId(varsObj: { moduleName: NomeModulosZoho, idRecord: string }, tries: number = 0): Promise<ErrorStruct | SuccessStruct> {

        const { name: funcName } = this.getRecordByModuleId

        const { moduleName, idRecord } = varsObj || {}

        if ([moduleName, idRecord].some((e) => !e || typeof e != 'string')) return errorStruct(funcName, "O ID da entidade ou nome do módulo estão incorretos", { moduleName, idRecord })

        try {

            const { data: zohoResult, status } = await this.#api.get(`${moduleName}/${idRecord}`)

            const recordInfo = zohoResult?.data?.[0]

            if (!recordInfo?.id || status != 200) {
                return errorStruct(funcName, "Erro ao recuperar os dados da entidade", { zohoResult, status })
            }

            return { error: false, data: recordInfo }

        } catch (err) {

            const errorFix = await this.errorHandler({ err, funcName, funcVars: varsObj })

            if (typeof tries != 'number' || tries > 3 || tries < 0) {
                return errorStruct(funcName, "Limite de tentativas atingido.", { errorFix })
            }

            if (errorFix?.error) {
                return errorStruct(funcName, errorFix?.error, errorFix)
            }

            await delay(1500 * (tries || 1))
            return await this.getRecordByModuleId(varsObj, tries + 1)
        }

    }

    async getUserFromCRMById(userId: string, tries: number = 0): Promise<ErrorStruct | SuccessStruct> {

        const { name: funcName } = this.getUserFromCRMById

        if (!userId || typeof userId != 'string') return errorStruct(funcName, "o ID do usuário está inváldo", { userId })

        try {

            const { data: zohoResult, status } = await this.#api.get(`users/${userId}`)

            const userInfo = zohoResult?.users?.[0]

            if (!userInfo?.id || status != 200) {
                return errorStruct(funcName, "Erro ao recuperar os dados do usuário.", { zohoResult, status })
            }

            return { error: false, data: userInfo }

        } catch (err) {

            const errorFix = await this.errorHandler({ err, funcName, funcVars: { userId } })

            if (typeof tries != 'number' || tries > 3 || tries < 0) {
                return errorStruct(funcName, "Limite de tentativas atingido.", { errorFix })
            }

            if (errorFix?.error) {
                return errorStruct(funcName, errorFix?.error, errorFix)
            }

            await delay(1500 * (tries || 1))
            return await this.getUserFromCRMById(userId, tries + 1)
        }

    }

    async getUsersFromCRM(varsObj?: {}, queriedUsers: any[] = [], pagination: number = 1, tries: number = 0): Promise<ErrorStruct | SuccessStruct> {

        const { name: funcName } = this.getUsersFromCRM

        const { } = varsObj || {}
        // add custom parameters

        try {

            const { data: zohoResult, status } = await this.#api.get(`users?page=${pagination}&per_page=200&type=ActiveUsers`)

            const usersList = zohoResult?.users

            if ((!Array.isArray(usersList) || status != 200) && !queriedUsers?.length) {
                return errorStruct(funcName, "Erro ao recuperar os usuários do CRM", { zohoResult, status })
            }

            if (usersList?.length >= 200) {
                await delay(500)
                return await this.getUsersFromCRM(varsObj, [...queriedUsers, ...usersList], pagination + 50, tries)
            }

            const rawUsersList = Array.isArray(usersList) ? [...usersList, ...queriedUsers] : queriedUsers;

            const users: any[] = []

            const removeDupesMap = rawUsersList.reduce((acc, e) => {
                const id = e?.id
                if (id && ["number", "string"].includes(typeof id)) acc[id] = e
                return acc
            }, {})

            Object?.values?.(removeDupesMap)?.forEach?.((e) => users?.push?.(e))

            const activeUsers = users.filter((e) => {
                const { status, Isonline: isOnline } = e || {}
                if (status?.toLowerCase?.() != "active") return
                return true
            })

            if (!activeUsers?.length) return errorStruct(funcName, `Nenhum usuario ativo encontrado`, { activeUsers })

            return { error: false, data: activeUsers }

        } catch (err) {

            const errorFix = await this.errorHandler({ err, funcName, funcVars: varsObj })

            if (typeof tries != 'number' || tries > 3 || tries < 0) {
                return errorStruct(funcName, "Limite de tentativas atingido.", { errorFix })
            }

            if (errorFix?.error) {
                return errorStruct(funcName, errorFix?.error, errorFix)
            }

            await delay(1500 * (tries || 1))
            return await this.getUsersFromCRM(varsObj, queriedUsers, pagination, tries + 1)
        }

    }

    async getTagsByModule(moduleName: NomeModulosZoho, tries: number = 0): Promise<ErrorStruct | SuccessStruct> {

        const { name: funcName } = this.getTagsByModule

        if (!moduleName || typeof moduleName != 'string') {
            return errorStruct(funcName, "O modulo foi enviado incorretamente", { moduleName })
        }

        try {

            const { data: zohoResult, status } = await this.#api.get(`settings/tags?module=${moduleName}`)

            const tags = zohoResult?.tags

            if (!Array.isArray(tags) || status != 200) {
                return errorStruct(funcName, "As tags não foram localizadas no sistema, verifique se o mesmo ainda existe.", { zohoResult, moduleName, status })
            }

            return { error: false, data: tags }

        } catch (err) {

            const errorFix = await this.errorHandler({ err, funcName, funcVars: { moduleName } })

            if (typeof tries != 'number' || tries > 3 || tries < 0) {
                return errorStruct(funcName, "Limite de tentativas atingido.", { errorFix })
            }

            if (errorFix?.error) {
                return errorStruct(funcName, errorFix?.error, errorFix)
            }

            await delay(1500 * (tries || 1))
            return await this.getTagsByModule(moduleName, tries + 1)
        }

    }

    async criarNotaNoModulo(varsObj: { moduleName: string, idRecord: string, notaMap: { Note_Title: string, Note_Content: string } },
        tries: number = 0): Promise<ErrorStruct | SuccessStruct> {

        const { name: funcName } = this.criarNotaNoModulo

        const { moduleName, notaMap, idRecord } = varsObj || {}

        if (!moduleName || typeof moduleName != 'string') {
            return errorStruct(funcName, "Nome do módulo inválido inválido.", { moduleName })
        }

        if (!idRecord || typeof idRecord != 'string') {
            return errorStruct(funcName, "ID do Módulo inválido.", { idRecord })
        }
        //@ts-ignore
        notaMap["$se_module"] = moduleName
        //@ts-ignore
        notaMap.Parent_Id = idRecord
        //@ts-ignore
        const data = {
            data: [
                notaMap
            ]
        }
        // ele adiciona subform ao invés de substituir
        try {

            const { data: zohoResult, status } = await this.#api.post(`${moduleName}/${idRecord}/Notes`, data)

            if (status != 201) {
                return errorStruct(funcName, "Erro ao criar a Nota.", zohoResult)
            }

            return { error: false }

        } catch (err) {

            const errorFix = await this.errorHandler({ err, funcName, funcVars: varsObj })

            if (typeof tries != 'number' || tries > 3 || tries < 0) {
                return errorStruct(funcName, "Limite de tentativas atingido.", { errorFix })
            }

            if (errorFix?.error) {
                return errorStruct(funcName, errorFix?.error, errorFix)
            }

            await delay(1500 * (tries || 1))
            return await this.criarNotaNoModulo(varsObj, tries + 1)

        }

    }

    async converterLead(idLead: string, tries: number = 0): Promise<ErrorStruct | SuccessStruct> {

        const { name: funcName } = this.converterLead

        if (!Number(idLead)) return errorStruct(funcName, "O ID do Lead está inválido", { idLead })

        try {

            const { data: zohoResult, status } = await this.#api.post(`Leads/${idLead}/actions/convert`, {
                data: [
                    {
                        /*
                        "overwrite": true,
                        "notify_lead_owner": true,
                        "notify_new_entity_owner": true,
                        "Accounts": {
                            "id": "3652397000000624046"
                        },
                        "Deals": {
                            "Deal_Name": "test",
                            "Closing_Date": "2020-10-20",
                            "Stage": "Negotiation/Review",
                            "Amount": 20000000,
                            "Pipeline": "Standard (Standard)"
                        },
                        "carry_over_tags": {
                            "Contacts": [
                                "tag1",
                                "tag2"
                            ],
                            "Accounts": [
                                "tag1"
                            ],
                            "Deals": [
                                "tag1"
                            ]
                        }
                        */
                    }
                ]
            }, { headers: { "Content-Type": "application/json" } })

            const { Accounts: account, Contacts: contact } = zohoResult?.data?.[0]?.details || {}

            if (status != 200 || !account?.id || !contact?.id) {
                return errorStruct(funcName, "Erro ao criar a tarefa.", zohoResult)
            }

            return { error: false, data: { contact, account } }

        } catch (err) {

            const errorFix = await this.errorHandler({ err, funcName, funcVars: { idLead } })

            if (errorFix?.error) {
                return errorStruct(funcName, `Erro fatal ao criar tarefa do usuário`, errorFix)
            }

            await delay(1500 * (tries || 1))
            return await this.converterLead(idLead, tries + 1)

        }

    }

    async searchOnModuleByName(varsObj: { moduleName: string, recordValue: string, fieldName: string }, tries: number = 0): Promise<ErrorStruct | SuccessStruct> {

        const { name: funcName } = this.searchOnModuleByName

        const { moduleName, recordValue, fieldName } = varsObj || {}

        if ([moduleName, recordValue, fieldName].some((e) => !e || typeof e != 'string')) return errorStruct(funcName, "Parametros inválidos", { moduleName, fieldName, recordValue })

        try {

            const { data: zohoResult, status } = await this.#api.get(`${moduleName}/search?criteria=(${fieldName}:starts_with:${recordValue})`)

            const queried = zohoResult?.data?.[0]

            if (!queried?.id || status != 200) {
                return errorStruct(funcName, `Não foi encontrado um ${moduleName} com o ${fieldName} de valor ${recordValue}`, { zohoResult, moduleName, fieldName, recordValue })
            }

            return { error: false, data: queried }

        } catch (err) {

            const errorFix = await this.errorHandler({ err, funcName, funcVars: {} })

            if (typeof tries != 'number' || tries > 3 || tries < 0) {
                return errorStruct(funcName, "Limite de tentativas atingido.", { tries, errorFix })
            }

            if (errorFix?.error) {
                return errorStruct(funcName, ``, errorFix)
            }

            await delay(1500 * (tries || 1))
            return await this.searchOnModuleByName(varsObj, tries + 1)
        }

    }

    async getMetaFieldsFromModule(varsObj: { moduleName: string }, tries: number = 0): Promise<ErrorStruct | SuccessStruct> {

        const { name: funcName } = this.getMetaFieldsFromModule

        const { moduleName } = varsObj || {}

        if (!moduleName || typeof moduleName != 'string') return errorStruct(funcName, "O Nome do Módulo está inválido", { moduleName })

        try {

            const { data: zohoResult, status } = await this.#api.get(`settings/fields?module=${moduleName}`)

            const metadata = zohoResult?.fields

            if (status != 200) {
                return errorStruct(funcName, "Erro ao encontrar o módulo", zohoResult)
            }

            return { error: false, data: metadata }

        } catch (err) {

            const errorFix = await this.errorHandler({ err, funcName, funcVars: varsObj })

            if (typeof tries != 'number' || tries > 3 || tries < 0) {
                return errorStruct(funcName, "Limite de tentativas atingido.", { tries })
            }

            if (errorFix?.error) {
                return errorStruct(funcName, ``, errorFix)
            }

            await delay(1500 * (tries || 1))
            return await this.getMetaFieldsFromModule(varsObj, tries + 1)
        }

    }

    async errorHandler(varsObj: { err: string, funcName: string, funcVars: any }): Promise<ErrorStruct | SuccessStruct> {

        const { funcName, err, funcVars } = varsObj || {}
        //@ts-ignore
        const data = err?.response?.data?.data?.[0] || err?.response?.data?.[0] || err?.response?.data
        //@ts-ignore
        let { message, details } = data && typeof data == "object" && !Array.isArray(data) ? data : {}

        const { api_name, json_path } = details || {}

        const fieldsToRemove = ["request", "config", "headers"];

        fieldsToRemove.forEach((e) => {
            //@ts-ignore
            delete err?.response?.[e];
            //@ts-ignore
            delete err?.[e]
        })

        message = message?.toLowerCase?.()

        if (message?.includes?.("token") || message?.includes?.("authent") || message?.includes?.("oauth")) {

            const renew = await this.renewAccessToken()

            if (renew?.error) return errorStruct(funcName, renew?.error, { renew, message, details })

            return { error: false }
        }

        if (message?.includes?.("field")) {
            return errorStruct(funcName, "Campo obrigatório não informado no JSON.", { details, funcVars, err })
        }

        if (message?.includes?.("invalid data") && api_name === "id" && json_path?.includes?.("teste") && json_path?.includes?.("Usu_rio.id")) {
            // create your logic
        }

        if (message?.includes?.("duplicate data")) {
            // create your logic
        }

        if ([message].every((e) => e && typeof e == 'string')) {
            return errorStruct(funcName, `Erro fatal no Zoho: ${message}${typeof api_name == 'string' ? ' - no campo ' + api_name : ""}`, { funcVars, err: { api_name, message, details } })
        }
        //@ts-ignore
        return errorStruct(funcName, "Erro fatal não identificado.", { err: err?.response || err, funcVars })

    }

}

export default ZohoApiCollection
