import { delay, errorStruct, validaNumero, validateDate } from "../../util/helpers"
import ZohoApiCollection from "./collection"
import * as fs from "fs"
import { ErrorStruct, SuccessStruct } from "../../types/dto";
import logger from "../../util/logger";
import * as moment from "moment-timezone"
import { isObject } from "lodash";

const modulosUsados: string[] = ["Leads", "Contacts", "Accounts", "Tasks"]


class ZohoTypesGenerator extends ZohoApiCollection {

    constructor() {

        super();

    }
    async atualizaCamposDisponiveis() {

        const { data: jsonCampos, error: jsonCamposError } = await this.montaJSONCamposModulos()

        if (jsonCamposError) return errorStruct("atualizaCamposDisponiveis", jsonCamposError, jsonCampos)

        let text = `//ultima atualização do arquivo as ${moment().tz('America/Sao_Paulo')?.format?.("DD/MM/YYYY - hh:mm:ss")}\n\n// npm run update-zoho-types - para atualizar o arquivo zoho-entidades-types.ts com os campos mais recentes\n\n`;

        this.interfacesExtras().forEach((e) => {
            text += e
        })

        const modulos: string[] = []

        Object.entries(jsonCampos).forEach(([modulo, entidades], i) => {

            if (!modulo || typeof modulo != 'string') return

            text += `interface ${modulo} {\n`;

            modulos.push(modulo)

            Object.entries(entidades).forEach(([field, data], i2) => {

                if (!field || typeof field != 'string') return

                const { data_type } = data || {}

                if (!data_type || typeof data_type != 'string') return

                const sep = i2 + 1 == Object.entries(entidades).length ? "" : ","

                text += `   ${field}?: ${data_type}${sep}\n`

            })

            text += "}\n\n"

        })

        text += "type NomeModulosZoho = " + this.montaTipoListaString(modulos) + ";\n";
        text += "type ModulosZoho = " + this.montaTipoListaType(modulos) + ";\n";

        text += "export {\nDateTimeZoho,\nDateZoho,\nNomeModulosZoho,\nModulosZoho,\n";

        modulos.forEach((e, i) => {

            const sep = i + 1 == modulos.length ? "" : ","

            if (!e || typeof e != 'string') return

            text += ("   " + e + sep + "\n")

        })

        text += "}";

        await fs.writeFile("./src/types/zoho-entidades-types.ts", text, "utf-8", () => {
            logger.info("Novos tipos das entidades Zoho Atualizado com sucesso. Ligue novamente o servidor em modo Prod ou Local")
            process.exit()
        })

    }
    async montaJSONCamposModulos(): Promise<ErrorStruct | SuccessStruct> {

        const mapping: { [key: string]: any } = {}

        const existentTypes = {
            autonumber: "number",
            bigint: "number",
            boolean: "boolean",
            currency: "number",
            date: "DateZoho",
            datetime: "DateTimeZoho",
            double: "number",
            email: "string",
            fileupload: "any",
            formula: "number",
            integer: "number",
            lookup: "{ id: string, name?:string }",
            multiselectlookup: "{ id: string, name?:string }[]",
            ownerlookup: "{id: string}",
            subform: "query",
            text: "string",
            textarea: "string",
            userlookup: "{id: string, name?:string }",
            website: "string",
            phone: "string"
        }

        for (const e of modulosUsados) {

            await delay(200)

            const { data, error } = await this.getMetaFieldsFromModule({ moduleName: e })

            if (error) continue

            if (Array.isArray(data)) {

                const acc = {
                    id: {
                        data_type: "string",
                        field_label: "id",
                        id: "000000"
                    }
                }

                if (e == "Tasks") acc["$se_module"] = {
                    data_type: `"Accounts" | "Leads" | "Contacts"`,
                    field_labe: "se_module",
                    id: "i428498"
                };

                alt1: for (const e1 of data) {

                    const { api_name, data_type, field_label, id, visible, subform, pick_list_values } = e1 || {}

                    if (!api_name || typeof api_name != 'string') continue
                    if (!visible) continue

                    if (api_name?.toLowerCase?.() == "tag") {

                        acc[api_name] = {
                            data_type: existentTypes.multiselectlookup,
                            field_label,
                            id
                        }

                        continue alt1
                    }

                    if (data_type == "subform") {

                        const { module: subFormName } = subform || {}

                        await delay(200)

                        const { data: subFormFields, error: subFormFieldsError } = await this.getMetaFieldsFromModule({ moduleName: subFormName })

                        if (subFormFieldsError) return errorStruct("a", subFormFieldsError, subFormFields)

                        const subFormTypes = {
                            id: {
                                data_type: "string",
                                field_label: "id",
                                id: "000000"
                            }
                        }

                        alt2: for (const e2 of subFormFields) {

                            const { api_name: api_name2, data_type: data_type2, field_label: field_label2,
                                id: id2, visible: visible2, pick_list_values:subPickList } = e2 || {}

                            if (!api_name2 || typeof api_name2 != 'string') continue alt2
                            if (!visible2) continue alt2

                            if (data_type == "multiselectpicklist" && Array.isArray(subPickList)) {

                                const options = subPickList.reduce((acc, e3, i3) => {
        
                                    const sep = i3 == 0 || i3 + 1 != subPickList.length ? "|" : ")[] | []";
        
                                    if (!e3?.display_value || typeof e3?.display_value != 'string') return acc
        
                                    if (e3?.display_value.toLowerCase().includes("none")) {
                                        acc += (` null ` + sep)
                                        return acc
                                    }
        
                                    acc += (` "${e3?.display_value}" ` + sep)
        
                                    return acc
        
                                }, "(")
        
                                subFormTypes[api_name2] = {
                                    data_type: options,
                                    field_label,
                                    id
                                }
        
                                continue alt2
        
                            }
        
                            if (data_type2 == "picklist" && Array.isArray(subPickList)) {
        
                                const options = subPickList.reduce((acc, e3, i3) => {
        
                                    const sep = i3 == 0 || i3 + 1 != subPickList.length ? "|" : "";
        
                                    if (!e3?.display_value || typeof e3?.display_value != 'string') return acc
        
                                    if (e3?.display_value.toLowerCase().includes("none")) {
                                        acc += (` null ` + sep)
                                        return acc
                                    }
        
                                    acc += (` "${e3?.display_value}" ` + sep)
        
                                    return acc
        
                                }, "")
        
                                subFormTypes[api_name2] = {
                                    data_type: options,
                                    field_label,
                                    id
                                }
        
                                continue alt2
        
                            }

                            subFormTypes[api_name2] = {
                                data_type: existentTypes[data_type2],
                                field_label: field_label2,
                                id: id2
                            }

                        }

                        acc[api_name] = {
                            data_type: `Subform_${subFormName}[] | null`,
                            field_label,
                            id
                        }

                        mapping["Subform_" + subFormName] = subFormTypes

                        continue alt1

                    }

                    if (data_type == "multiselectpicklist" && Array.isArray(pick_list_values)) {

                        const options = pick_list_values.reduce((acc, e2, i2) => {

                            const sep = i2 == 0 || i2 + 1 != pick_list_values.length ? "|" : ")[] | []";

                            if (!e2?.display_value || typeof e2?.display_value != 'string') return acc

                            if (e2?.display_value.toLowerCase().includes("none")) {
                                acc += (` null ` + sep)
                                return acc
                            }

                            acc += (` "${e2?.display_value}" ` + sep)

                            return acc

                        }, "(")

                        acc[api_name] = {
                            data_type: options,
                            field_label,
                            id
                        }

                        continue alt1

                    }

                    if (data_type == "picklist" && Array.isArray(pick_list_values)) {

                        const options = pick_list_values.reduce((acc, e2, i2) => {

                            const sep = i2 == 0 || i2 + 1 != pick_list_values.length ? "|" : "";

                            if (!e2?.display_value || typeof e2?.display_value != 'string') return acc

                            if (e2?.display_value.toLowerCase().includes("none")) {
                                acc += (` null ` + sep)
                                return acc
                            }

                            acc += (` "${e2?.display_value}" ` + sep)

                            return acc

                        }, "")

                        acc[api_name] = {
                            data_type: options,
                            field_label,
                            id
                        }

                        continue alt1

                    }

                    acc[api_name] = {
                        data_type: existentTypes[data_type],
                        field_label,
                        id
                    }

                }

                mapping[e] = acc

            }

        }

        return { error: false, data: mapping }

    }

    montaTipoListaString(strs: string[]): string {

        let text = ""

        Array.isArray(strs) && strs.forEach((e, i) => {

            if (!e || typeof e != 'string') return

            text += (` "${e}" ` + `${i + 1 == strs.length ? "" : "|"}`)

        })

        return text

    }
    montaTipoListaType(strs: string[]): string {

        let text = ""

        Array.isArray(strs) && strs.forEach((e, i) => {

            if (!e || typeof e != 'string') return

            text += (` ${e} ` + `${i + 1 == strs.length ? "" : "|"}`)

        })

        return text

    }

    interfacesExtras(): string[] {


        const a1 = `type PrependNextNum<A extends Array<unknown>> = A['length'] extends infer T ? ((t: T, ...a: A) => void) extends ((...x: infer X) => void) ? X : never : never;\n
        type EnumerateInternal<A extends Array<unknown>, N extends number> = { 0: A, 1: EnumerateInternal<PrependNextNum<A>, N> }[N extends A['length'] ? 0 : 1];\n
        export type Enumerate<N extends number> = EnumerateInternal<[], N> extends (infer E)[] ? E : never;\n
        export type Range<FROM extends number, TO extends number> = Exclude<Enumerate<TO>, Enumerate<FROM>>;\n
        type MS = Range<0, 60>;\n
        type HR = Range<0, 24>;\n
        type ZeroToNine = Range<0, 10>;\n
        type OneToNine = Range<1,10>;\n`;

        const a2 = "type YYYY = `19${ZeroToNine}${ZeroToNine}` | `20${ZeroToNine}${ZeroToNine}`;\ntype MM = `0${OneToNine}` | `1${0 | 1 | 2};`\ntype DD = `${0}${OneToNine}` | `${1 | 2}${OneToNine}` | `3${0 | 1}`;\ntype DateZoho = `${YYYY}-${MM}-${DD}` | string;\ntype DateTimeZoho = string;\n";

        return [a1, a2]

    }

}
export default ZohoTypesGenerator

