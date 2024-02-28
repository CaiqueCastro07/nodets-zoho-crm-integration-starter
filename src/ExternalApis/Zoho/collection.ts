import { ReturnStruct } from "../../types/dto";
import { cloneObject, delay, Ambiente, isObject, randomNumber } from "../../util/helpers"
import { getZohoTokenDB } from "../../database/databaseServices"
import axios, { AxiosInstance } from "axios";
import * as moment from "moment"
import { ModulosZoho, NomeModulosZoho, Users } from "../../types/zoho-entidades-types"
import { ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, TEST_ZOHO_REFRESH_TOKEN } from "../../util/secrets"
import * as nodeCron from "node-cron"

const isProd = Ambiente.is == "prod"

const accessTokenQuantity = isProd ? 4 : 1 // in the local/test environment will only create one access token, on prod will create 5 - the limit is 10
const localAccessToken: string[] = [];
const localClientId: string | undefined = ZOHO_CLIENT_ID; // colocar aqui o client ID
const localClientSecret: string | undefined = ZOHO_CLIENT_SECRET; // colocar aqui o clientSecret
let localRefreshToken: string = isProd ? null : TEST_ZOHO_REFRESH_TOKEN
let accessTokenRenewing: boolean = false
//@ts-ignore
const RELATED_MODULES_NAMES: Record<NomeModulosZoho, Record<string, NomeModulosZoho>> = {
    "Contratos": {
        "Related_List_Name_1": "Chaves_Gemalto",
        "Contratos1": "Itens_da_Proposta1"
    },
    "Propostas": {
        "Produtos_da_Proposta1": "Produto_do_Contrato",
    },
    "Sales_Orders": {
        "Contratos_2_0": "Chaves_Gemalto",
        "Contrato_2_01": "Itens_da_Proposta1",
    },
    "Quotes": {
        "Produtos_da_proposta": "Produto_do_Contrato"
    }
}

class ZohoApiCollection {
    //@ts-ignore
    private static record_caching: Record<NomeModulosZoho, Record<string, ModulosZoho & { reseting?: boolean }>> = {}
    private static modules_to_cache: NomeModulosZoho[] = ["Products"]
    private static limpezaCache = nodeCron.schedule("*/30 * * * *", function () {
        Object.values(ZohoApiCollection.record_caching).forEach((e) => {
            //@ts-ignore
            if (!isObject(e)) return
            //@ts-ignore
            e.reseting = true
            Object.keys(e).filter((e1) => e1 != "reseting").forEach((e1) => {
                //@ts-ignore
                delete e[e1]
            })
            //@ts-ignore
            e.reseting = false
        })
    });

    private readonly getRecordCache = (idRecord: string, moduleName: NomeModulosZoho): ModulosZoho => {
        if (!idRecord || typeof idRecord != 'string') return null;
        if (!moduleName || typeof moduleName != 'string') return null;
        const record = ZohoApiCollection.record_caching?.[moduleName]?.[idRecord];
        return record?.id ? cloneObject(record) : null
    }
    private readonly setRecordCache = (record: ModulosZoho, moduleName: NomeModulosZoho): boolean => {
        if (ZohoApiCollection.record_caching?.[moduleName]?.reseting) return false
        if (!moduleName || typeof moduleName != 'string') return false
        if (!isObject(record) || !record?.id) return false

        const cachingDoModulo = ZohoApiCollection.record_caching[moduleName]

        if (!isObject(cachingDoModulo)) {
            ZohoApiCollection.record_caching[moduleName] = { [record.id]: cloneObject(record) }
        } else {
            cachingDoModulo[record.id] = cloneObject(record)
        }

        return true

    }

    #api: AxiosInstance
    readonly #giroAccessToken: () => string
    readonly #updateApiInstance: (versao?: 1 | 2 | 3 | 4 | 5, keepToken?: boolean) => void

    constructor() {

        this.#giroAccessToken = function (): string {

            const firstToken = localAccessToken?.shift()

            if (!firstToken || typeof firstToken != 'string') return ""

            localAccessToken.push(firstToken)

            return firstToken

        }

        this.#updateApiInstance = (versao?: 1 | 2 | 3 | 4 | 5, keepToken?: boolean) => {

            this.#api = axios.create({
                baseURL: `https://www.zohoapis.com/crm/v${Number(versao) && [1, 2, 3, 4, 5].includes(Number(versao)) ? Number(versao) : 5}/`,
                headers: {
                    Authorization: `Zoho-oauthtoken ${keepToken ? localAccessToken[localAccessToken.length - 1] || "" : this.#giroAccessToken()}`,
                    Accept: "*/*",
                    "Accept-Encoding": 'application/json'
                },
                timeout: 45000
            });

        }

        this.#updateApiInstance()

    }
    private async renewAccessToken(): Promise<ReturnStruct<null>> {

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
                return [new Error("Erro ao renovar os acesstokens da fila", { cause: localAccessToken }), null]
            }

            accessTokenRenewing = false;

            this.#updateApiInstance()

            return [null, null]

        }

        if (!localRefreshToken || typeof localRefreshToken != 'string') {

            const [zohoTokensError, zohoTokens] = await getZohoTokenDB()

            if (zohoTokensError) {
                accessTokenRenewing = false;
                return [zohoTokensError, null]
            }

            const { refreshToken } = zohoTokens || {}

            if (!refreshToken || typeof refreshToken != 'string') {
                accessTokenRenewing = false;
                return [new Error("Erro nas credenciais do Zoho no Banco de Dados", { cause: { zohoTokens } }), null]
            }

            localRefreshToken = refreshToken.trim()

        }

        const [getAccessTokensError] = await this.getAccessTokens(accessTokenQuantity)

        if (getAccessTokensError) {
            accessTokenRenewing = false;
            return [getAccessTokensError, null]
        }

        this.#updateApiInstance()

        accessTokenRenewing = false;

        return [null, null]

    }

    private async getAccessTokens(amount: number, tries: number = 0): Promise<ReturnStruct<null>> {

        const { name: funcName } = this.getAccessTokens

        if (typeof amount != 'number' || amount <= 0 || amount > 10) {

            if (localAccessToken?.length) return [null, null];
            return [new Error("Erro ao gerar os novos accesstokens", { cause: { localAccessToken } }), null];

        }

        try {

            const { data, status } = await axios.post(`https://accounts.zoho.com/oauth/v2/token?refresh_token=${localRefreshToken}&client_id=${localClientId}&client_secret=${localClientSecret}&grant_type=refresh_token`) || {}

            const newAccessToken = data?.access_token

            if (!newAccessToken || typeof newAccessToken != 'string') {

                if (localAccessToken?.length) {
                    await delay(500)
                    return await this.getAccessTokens(amount, tries + 1)
                }

                localRefreshToken = "";

                return [new Error("Erro ao renovar o Access Token da Zoho.", { cause: { data, status } }), null]
            }

            localAccessToken.push(newAccessToken)

            await delay(500)

            return await this.getAccessTokens(amount - 1, tries)

        } catch (err) {

            const [errorFix] = await this.errorHandler({ err, funcName, funcVars: { amount } })

            if (typeof tries != 'number' || tries > 3 || tries < 0) return [new Error("Limite de tentativas atingido.", { cause: { tries } }), null]

            if (errorFix) return [errorFix, null]

            await delay(1500 * (tries || 1))
            return await this.getAccessTokens(amount, tries + 1)

        }

    }

    async getRecordByModuleId<Modulo extends ModulosZoho>(varsObj: { moduleName: NomeModulosZoho, idRecord: string, getCache?: boolean }, tries: number = 0)
        : Promise<ReturnStruct<Modulo>> {

        const { name: funcName } = this.getRecordByModuleId || {}

        const { moduleName, idRecord, getCache } = varsObj || {}

        if ([moduleName, idRecord].some((e) => !e || typeof e != 'string')) {
            return [new Error("O ID da entidade ou nome do módulo estão incorretos", { cause: { moduleName, idRecord } }), null]
        }

        if (getCache) {

            const foundCache = this.getRecordCache(idRecord, moduleName)

            if (foundCache?.id) return [null, foundCache as Modulo]

        }

        try {

            const { data: zohoResult, status } = await this.#api.get(`${moduleName}/${idRecord}`)

            const recordInfo = zohoResult?.data?.[0]

            if (!recordInfo?.id || status != 200) {
                if (status == 204) return [null, {} as Modulo]
                return [new Error("Erro ao recuperar os dados da entidade", { cause: { zohoResult, status } }), null]
            }

            if (ZohoApiCollection.modules_to_cache.includes(moduleName)) {
                this.setRecordCache(recordInfo, moduleName)
            }

            return [null, recordInfo]

        } catch (err) {

            const [errorFix] = await this.errorHandler({ err, funcName, funcVars: varsObj })

            if (typeof tries != 'number' || tries > 3 || tries < 0) return [new Error("Limite de tentativas atingido.", { cause: { varsObj } }), null]

            if (errorFix) return [errorFix, null]

            await delay(1500 * (tries || 1))
            return await this.getRecordByModuleId(varsObj, tries + 1)
        }

    }


    async createRecordOnModule<Modulo extends ModulosZoho>(varsObj: {
        moduleName: NomeModulosZoho | string, createMap: Modulo, trigger?: ("workflow" | "blueprint")[], atualizaExistente?: boolean
    }, tries: number = 0): Promise<ReturnStruct<{ recordId: string }>> {

        const { name: funcName } = this.createRecordOnModule

        const { moduleName, createMap, trigger, atualizaExistente } = varsObj || {}

        if (!moduleName || typeof moduleName != 'string') {
            return [new Error("Nome do módulo inválido.", { cause: { moduleName } }), null]
        }

        if (!isObject(createMap)) {
            return [new Error("O mapa de criação está inválido", { cause: { createMap } }), null]
        }

        const data: { data: Modulo[], trigger?: ("workflow" | "blueprint")[] } = {
            data: [createMap]
        }

        if (Array.isArray(trigger)) {
            data.trigger = trigger
        }

        try {

            const { data: zohoResult, status } = await this.#api.post(`${moduleName}`, data)

            const idCreation = zohoResult?.data?.[0]?.details?.id

            if ((status != 201 && status != 200) || !idCreation) {
                return [new Error(`Erro ao criar o ${moduleName}.`, { cause: { zohoResult } }), null]
            }

            return [null, { recordId: idCreation }]

        } catch (err) {

            const [errorFix, errorFixData] = await this.errorHandler({ err, funcName, funcVars: varsObj })

            if (typeof tries != 'number' || tries > 3 || tries < 0) return [new Error("Limite de tentativas atingido.", { cause: { tries } }), null]

            if (errorFix) return [errorFix, null]
            //@ts-ignore
            const { moduleName: moduloDoDuplicado, idRecord: idRecordDoDuplicado } = errorFixData || {}

            if (atualizaExistente && moduleName == moduloDoDuplicado && idRecordDoDuplicado) {

                const [updatedExistentError] = await this.updateRecordByModuleAndId({
                    moduleName, idRecord: idRecordDoDuplicado, updateMap: createMap
                })

                if (updatedExistentError) return [updatedExistentError, null]

                return [null, { recordId: idRecordDoDuplicado }]

            }

            await delay(1500 * (tries || 1))
            return await this.createRecordOnModule(varsObj, tries + 1)

        }

    }

    async updateRecordByModuleAndId<Modulo extends ModulosZoho>(varsObj: {
        moduleName: NomeModulosZoho | string, idRecord: string | number,
        updateMap: Modulo, trigger?: ("workflow" | "blueprint")[]
    }, tries: number = 0): Promise<ReturnStruct<null>> {

        const { name: funcName } = this.updateRecordByModuleAndId

        const { moduleName, updateMap, idRecord, trigger } = varsObj || {}

        if (!moduleName || typeof moduleName != 'string') {
            return [new Error("Nome do módulo inválido.", { cause: { moduleName } }), null]
        }

        if (!idRecord || typeof idRecord != 'string') {
            return [new Error("ID do Registro  inválido.", { cause: { idRecord } }), null]
        }

        if (!isObject(updateMap)) {
            return [new Error("O mapa de atualização está inválido", { cause: { updateMap } }), null]
        }

        const data: { data: ModulosZoho[], trigger?: ("workflow" | "blueprint")[] } = {
            data: [updateMap]
        }

        if (Array.isArray(trigger)) {
            data.trigger = trigger
        }

        try {

            const { data: zohoResult, status } = await this.#api.put(`${moduleName}/${idRecord}`, data)

            if (status != 200) return [new Error(`Erro ao atualizar o módulo ${moduleName}`, { cause: { zohoResult } }), null]

            return [null, null]

        } catch (err) {

            const [errorFix] = await this.errorHandler({ err, funcName, funcVars: varsObj })

            if (typeof tries != 'number' || tries > 3 || tries < 0) return [new Error("Limite de tentativas atingido.", { cause: { tries } }), null]

            if (errorFix) return [errorFix, null]

            await delay(1500 * (tries || 1))
            return await this.updateRecordByModuleAndId(varsObj, tries + 1)

        }

    }

    async rawCoqlSearch<Module extends ModulosZoho>(query: string, tries: number = 1): Promise<ReturnStruct<Module[]>> {

        const { name: funcName } = this.rawCoqlSearch || {}

        if (!query || typeof query != 'string') return [new Error("O Query informado está inválido", { cause: { query } }), null]

        try {

            this.#updateApiInstance(3, true)

            const { data: zohoResult, status } = await this.#api.post(`coql`, {
                select_query: query
            }, {
                headers: {
                    "Content-Type": "application/json"
                }
            })

            this.#updateApiInstance(5, true)

            if (status == 204) return [null, []];

            if (status != 200) return [new Error("Erro ao encontrar os dados via COQL no Zoho", { cause: { zohoResult } }), null]

            const results: Module[] = Array.isArray(zohoResult?.data) ? zohoResult.data : []

            return [null, results]

        } catch (err) {

            this.#updateApiInstance(5, true)

            const [errorFix] = await this.errorHandler({ err, funcName, funcVars: { query } })

            if (typeof tries != 'number' || tries > 3 || tries < 0) return [new Error("Limite de tentativas atingido.", { cause: { tries } }), null]

            if (errorFix) return [errorFix, null]

            await delay(1500 * (tries || 1))
            return await this.rawCoqlSearch(query, tries + 1)
        }

    }
    async getUserFromCRMById(userId: string, tries: number = 0)
        : Promise<ReturnStruct<Users>> {

        const { name: funcName } = this.getUserFromCRMById || {}

        if (!userId || typeof userId != 'string') return [new Error("o ID do usuário está inváldo", { cause: { userId } }), null]

        try {

            const { data: zohoResult, status } = await this.#api.get(`users/${userId}`)

            const userInfo: Users = zohoResult?.users?.[0]

            if (!userInfo?.id || status != 200) return [new Error("Erro ao recuperar os dados do usuário.", { cause: { zohoResult, status } }), null]

            return [null, userInfo]

        } catch (err) {

            const [errorFix] = await this.errorHandler({ err, funcName, funcVars: { userId } })

            if (typeof tries != 'number' || tries > 3 || tries < 0) return [new Error("Limite de tentativas atingido.", { cause: { tries } }), null]

            if (errorFix) return [errorFix, null]

            await delay(1500 * (tries || 1))

            return await this.getUserFromCRMById(userId, tries + 1)
        }

    }

    async getUsersFromCRM(varsObj?: {}, queriedUsers: any[] = [], pagination: number = 1, tries: number = 0)
        : Promise<ReturnStruct<{ id: string, name: string }[]>> {

        const { name: funcName } = this.getUsersFromCRM

        const { } = varsObj || {}
        // add custom parameters

        try {

            const { data: zohoResult, status } = await this.#api.get(`users?page=${pagination}&per_page=200&type=ActiveUsers`)

            const usersList = zohoResult?.users

            if ((!Array.isArray(usersList) || status != 200) && !queriedUsers?.length) {
                return [new Error("Erro ao recuperar os usuários do CRM", { cause: { zohoResult, status } }), null]
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

            if (!activeUsers?.length) return [new Error(`Nenhum usuario ativo encontrado`, { cause: { activeUsers } }), null]

            return [null, activeUsers]

        } catch (err) {

            const [errorFix] = await this.errorHandler({ err, funcName, funcVars: varsObj })

            if (typeof tries != 'number' || tries > 3 || tries < 0) return [new Error("Limite de tentativas atingido.", { cause: { tries } }), null]

            if (errorFix) return [errorFix, null]

            await delay(1500 * (tries || 1))

            return await this.getUsersFromCRM(varsObj, queriedUsers, pagination, tries + 1)

        }

    }

    async getTagsByModule(moduleName: NomeModulosZoho, tries: number = 0)
        : Promise<ReturnStruct<{ id: string, name: string }[]>> {

        const { name: funcName } = this.getTagsByModule

        if (!moduleName || typeof moduleName != 'string') return [new Error("O modulo foi enviado incorretamente", { cause: { moduleName } }), null]

        try {

            const { data: zohoResult, status } = await this.#api.get(`settings/tags?module=${moduleName}`)

            const tags = zohoResult?.tags

            if (!Array.isArray(tags) || status != 200) {
                return [new Error("As tags não foram localizadas no sistema, verifique se o mesmo ainda existe.", { cause: { zohoResult, moduleName, status } }), null]
            }

            return [null, tags]

        } catch (err) {

            const [errorFix] = await this.errorHandler({ err, funcName, funcVars: { moduleName } })

            if (typeof tries != 'number' || tries > 3 || tries < 0) return [new Error("Limite de tentativas atingido.", { cause: { tries } }), null]

            if (errorFix) return [errorFix, null]

            await delay(1500 * (tries || 1))
            return await this.getTagsByModule(moduleName, tries + 1)
        }

    }

    async findRecordOnModulesById<Modulo extends ModulosZoho>(varsObj: {
        modulesToSearch: NomeModulosZoho[], idRecord: string,
        tryCOQL?: (keyof Modulo)[]
    })
        : Promise<ReturnStruct<{ moduleName: NomeModulosZoho | null, fullData: Modulo | null }>> {

        const { modulesToSearch, idRecord, tryCOQL } = varsObj || {}

        if (!Array.isArray(modulesToSearch) || modulesToSearch.some((e) => !e || typeof e != 'string')) return [new Error("A lista de módulos para procurar está inválida", { cause: { modulesToSearch } }), null]
        if (!Number(idRecord)) return [new Error("O ID do Registro está inválido", { cause: { idRecord } }), null]

        let errorE: Error | undefined;

        for (const e of modulesToSearch) {

            await delay(200)

            const [error, data] = await this.getRecordByModuleId({ moduleName: e, idRecord })

            if (error) {
                errorE = error
                continue
            }

            if (!data?.id) continue

            return [null, { moduleName: e, fullData: data as Modulo }]

        }

        if (errorE) return [errorE, null]

        return [null, { moduleName: null, fullData: null }]

    }

    async criarNotaNoModulo(varsObj: { moduleName: string, idRecord: string, notaMap: { Note_Title: string, Note_Content: string } },
        tries: number = 0): Promise<ReturnStruct<null>> {

        const { name: funcName } = this.criarNotaNoModulo

        const { moduleName, notaMap, idRecord } = varsObj || {}

        if (!moduleName || typeof moduleName != 'string') {
            return [new Error("Nome do módulo inválido inválido.", { cause: { moduleName } }), null]
        }

        if (!idRecord || typeof idRecord != 'string') {
            return [new Error("ID do Módulo inválido.", { cause: { idRecord } }), null]
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

            if (status != 201 && status != 200) return [new Error("Erro ao criar a Nota.", { cause: { zohoResult } }), null]

            return [null, null]

        } catch (err) {

            const [errorFix] = await this.errorHandler({ err, funcName, funcVars: varsObj })

            if (typeof tries != 'number' || tries > 3 || tries < 0) return [new Error("Limite de tentativas atingido.", { cause: { tries } }), null]

            if (errorFix) return [errorFix, null]

            await delay(1500 * (tries || 1))
            return await this.criarNotaNoModulo(varsObj, tries + 1)

        }

    }

    async converterLead(idLead: string, tries: number = 0)
        : Promise<ReturnStruct<{ contact: { id: string }, account: { id: string } }>> {

        const { name: funcName } = this.converterLead

        if (!Number(idLead)) return [new Error("O ID do Lead está inválido", { cause: { idLead } }), null]

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
                return [new Error("Erro ao criar a tarefa.", { cause: { zohoResult } }), null]
            }

            return [null, { contact, account }]

        } catch (err) {

            const [errorFix] = await this.errorHandler({ err, funcName, funcVars: { idLead } })

            if (typeof tries != 'number' || tries > 3 || tries < 0) return [new Error("Limite de tentativas atingido.", { cause: { tries } }), null]

            if (errorFix) return [errorFix, null]

            await delay(1500 * (tries || 1))
            return await this.converterLead(idLead, tries + 1)

        }

    }

    async searchOnModuleByName(varsObj: { moduleName: string, recordValue: string, fieldName: string }, tries: number = 0)
        : Promise<ReturnStruct<Record<string, any>>> {

        const { name: funcName } = this.searchOnModuleByName

        const { moduleName, recordValue, fieldName } = varsObj || {}

        if ([moduleName, recordValue, fieldName].some((e) => !e || typeof e != 'string')) return [null, new Error("Parametros inválidos", { cause: { moduleName, fieldName, recordValue } })]

        try {

            const { data: zohoResult, status } = await this.#api.get(`${moduleName}/search?criteria=(${fieldName}:starts_with:${recordValue})`)

            const queried = zohoResult?.data?.[0]

            if (!queried?.id || status != 200) {
                return [null, new Error(`Não foi encontrado um ${moduleName} com o ${fieldName} de valor ${recordValue}`, { cause: { zohoResult } })]
            }

            return [queried, null]

        } catch (err) {

            const [errorFix] = await this.errorHandler({ err, funcName, funcVars: varsObj })

            if (typeof tries != 'number' || tries > 3 || tries < 0) return [new Error("Limite de tentativas atingido.", { cause: { tries } }), null]

            if (errorFix) return [errorFix, null]

            await delay(1500 * (tries || 1))

            return await this.searchOnModuleByName(varsObj, tries + 1)
        }

    }

    async searchOnModuleByCOQL(varsObj: { moduleName: string, recordValue: string, fieldName: string }, tries: number = 0)
        : Promise<ReturnStruct<Record<string, any>>> {

        const { name: funcName } = this.searchOnModuleByCOQL || {}

        const { moduleName, recordValue, fieldName } = varsObj || {}

        if ([moduleName, recordValue, fieldName].some((e) => !e || typeof e != 'string')) return [new Error("Parametros inválidos", { cause: { moduleName, fieldName, recordValue } }), null]

        try {

            const { data: zohoResult, status } = await this.#api.get(`${moduleName}/search?criteria=(${fieldName}:starts_with:${recordValue})`)

            const queried: ModulosZoho = zohoResult?.data?.[0]

            if (!queried?.id || status != 200) {
                return [new Error(`Não foi encontrado um ${moduleName} com o ${fieldName} de valor ${recordValue}`, { cause: { zohoResult } }), null]
            }

            return [null, queried]

        } catch (err) {

            const [errorFix] = await this.errorHandler({ err, funcName, funcVars: varsObj })

            if (typeof tries != 'number' || tries > 3 || tries < 0) return [new Error("Limite de tentativas atingido.", { cause: { tries } }), null]

            if (errorFix) return [errorFix, null]

            await delay(1500 * (tries || 1))
            return await this.searchOnModuleByName(varsObj, tries + 1)
        }

    }
    async getRelatedRecordByModuleId<Modulo extends ModulosZoho>(varsObj: { moduleName: NomeModulosZoho, relatedModuleName: string, idRecord: string }, tries: number = 0)
        : Promise<ReturnStruct<Modulo[]>> {

        const { name: funcName } = this.getRelatedRecordByModuleId || {}

        const { moduleName, idRecord, relatedModuleName } = varsObj || {}

        if ([moduleName, idRecord, relatedModuleName].some((e) => !e || typeof e != 'string')) {
            return [new Error("O ID da entidade ou nome do módulo estão incorretos", { cause: { moduleName, idRecord } }), null]
        }

        try {

            const { data: zohoResult, status } = await this.#api.get(`${moduleName}/${idRecord}/${relatedModuleName}?fields=id`)

            const records: Modulo[] = zohoResult?.data

            if (status != 200 || !Array.isArray(records)) {

                if (status == 204) return [null, []]
                return [new Error("Erro ao recuperar os dados da lista relacionada", { cause: { zohoResult, status } }), null]
            }

            const nomeModuloOriginal = RELATED_MODULES_NAMES?.[moduleName]?.[relatedModuleName]

            if (!nomeModuloOriginal) return [new Error("O nome do módulo original para a lista relacionada informada não foi encontrado", { cause: { moduleName, relatedModuleName, RELATED_MODULES_NAMES } }), null]

            let errorLoadingRecords: Error;

            await Promise.all(records.map(async (e, i) => {

                if (errorLoadingRecords) return

                const { id } = e || {}

                const [error, data] = await this.getRecordByModuleId<Modulo>({
                    moduleName: nomeModuloOriginal, idRecord: id
                })

                if (error) {
                    errorLoadingRecords = error
                    return
                }

                if (!data?.id) {
                    errorLoadingRecords = new Error(`Erro ao carregar o ${nomeModuloOriginal} de ID ${id}`, { cause: data })
                    return
                }

                records[i] = data

            }))

            if (errorLoadingRecords) return [errorLoadingRecords, null]

            return [null, records]

        } catch (err) {

            const [errorFix] = await this.errorHandler({ err, funcName, funcVars: varsObj })

            if (typeof tries != 'number' || tries > 3 || tries < 0) return [new Error("Limite de tentativas atingido.", { cause: { varsObj } }), null]

            if (errorFix) return [errorFix, null]

            await delay(1500 * (tries || 1))
            return await this.getRelatedRecordByModuleId(varsObj, tries + 1)
        }

    }
    async getMetaFieldsFromModule(varsObj: { moduleName: string }, tries: number = 0)
        : Promise<ReturnStruct<Record<string, any>[]>> {

        const { name: funcName } = this.getMetaFieldsFromModule || {}

        const { moduleName } = varsObj || {}

        if (!moduleName || typeof moduleName != 'string') return [new Error("O Nome do Módulo está inválido", { cause: { moduleName } }), null]

        try {

            const { data: zohoResult, status } = await this.#api.get(`settings/fields?module=${moduleName}`)

            const metadata: any[] = Array.isArray(zohoResult?.fields) ? zohoResult.fields : []

            if (status != 200) {
                return [new Error("Erro ao encontrar o módulo", { cause: { zohoResult } }), null]
            }

            return [null, metadata]

        } catch (err) {

            const [errorFix] = await this.errorHandler({ err, funcName, funcVars: varsObj })

            if (typeof tries != 'number' || tries > 3 || tries < 0) return [new Error("Limite de tentativas atingido.", { cause: { tries } }), null]

            if (errorFix) return [errorFix, null]

            await delay(1500 * (tries || 1))
            return await this.getMetaFieldsFromModule(varsObj, tries + 1)
        }

    }

    async errorHandler(varsObj: { err: any, funcName: string, funcVars: any })
        : Promise<ReturnStruct<null>> {
        //@ts-ignore
        const { funcName, err, funcVars, atualizaExistente } = varsObj || {}

        const data = err?.response?.data?.data?.[0] || err?.response?.data?.[0] || err?.response?.data

        let { message, details } = data || {}

        const { api_name, json_path, duplicate_record } = details || {}

        const { api_name: modulo, id: idExistente } = duplicate_record?.module || {}

        const fieldsToRemove = ["request", "config", "headers"];

        fieldsToRemove.forEach((e) => {
            delete err?.response?.[e];
            delete err?.[e]
        })

        message = message?.toLowerCase?.()

        if (atualizaExistente && modulo && duplicate_record?.id) {
            //@ts-ignore
            return [null, { moduleName: modulo, idRecord: duplicate_record.id }]
        }

        if ((message?.includes?.("token") || message?.includes?.("authent") || message?.includes?.("oauth")) && !message?.includes?.("scope")) {

            const [renewError] = await this.renewAccessToken()

            if (renewError) return [renewError, null]

            return [null, null]
        }

        if (message?.includes?.("field")) {
            return [new Error("Campo obrigatório não informado no JSON.", { cause: err }), null]
        }

        if (message?.includes?.("invalid data") && api_name === "id" && json_path?.includes?.("teste") && json_path?.includes?.("Usu_rio.id")) {
            // create your logic
        }

        if (message?.includes?.("duplicate data")) {
            // create your logic
        }
        //many requests fired in concurrent than the allowed limit.
        if (["many", "request", "fired", "concurrent"].every((e) => message?.toLowerCase?.()?.includes?.(e))) {
            const random = randomNumber(2, 9)
            await delay(random * 1000)
            return [null, null]
        }

        if ([message].every((e) => e && typeof e == 'string')) {
            return [new Error(`Erro fatal no Zoho: ${message}${typeof api_name == 'string' ? ' - no campo ' + api_name : ""}`, { cause: err }), null]
        }

        return [new Error("Erro fatal não identificado.", { cause: err }), null]

    }

}

export default ZohoApiCollection