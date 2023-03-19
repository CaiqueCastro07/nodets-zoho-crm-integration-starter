import logger from "./logger"
import { Response } from 'express'
import { SECRET_KEY } from "./secrets"

const responseController = (statusNumber: number = 500, msg: string = 'mensagem vazia', register: boolean = false, data: any = {}, res: Response) => {
    // Todas as responses de requests deverão ser enviadas através dessa função
    const { name: funcName } = responseController

    if (!msg || typeof msg != 'string') {
        msg = "O texto da mensagem de retorno não foi informado corretamente, contate o suporte."
    }

    if (!statusNumber || typeof statusNumber != 'number') {
        statusNumber = 500
        msg = "Invalid status"
    }

    if (register) {
        // your logger option or rabbitmq config
    }

    const resObject = { status: statusNumber, message: msg, data: isCircularDependency(data) };

    return res.status(statusNumber).json(resObject).end()
}

const errorStruct = (functionName: string, message: string, data: any, log?: boolean): { func: string, error: string, data: any } => {

    if (typeof functionName !== "string" || !functionName) {
        functionName = "#functionName informado incorretamente"
    }

    if (typeof message !== "string" || !message) {
        message = "#message informado incorretamente."
    }

    const struct: { func: string, error: string, data: any } = { func: functionName, error: message, data: isCircularDependency(data) }

    if (log) logger.error(struct)

    return struct

}

function checkForInvalidStrings(): string[] | false {
    // recebe um array de objetos com uma unica key dentro
    const args = [...arguments];

    const errors: any[] = []

    args.forEach((e) => {

        if (!(e instanceof Object) || !Object?.keys?.(e)?.[0]) {
            //console.log("logger aqui")
            errors.push("Argumento errado validade strings, deve ser um objeto com uma key unica")
            return
        }

        const varName = Object?.keys?.(e)?.[0]
        const varValue = Object?.values?.(e)?.[0]

        if (!varValue || typeof varValue != 'string') {
            errors.push(varName)
            //console.log("logger aqui", varName)
            return
        }

    })

    return errors?.length ? errors : false

}

const splitAtCapitalLetter = (str: string) => {

    if (!str || typeof str != 'string') return false

    return str.split(/(?=[A-Z])/)?.join(" ")?.toUpperCase();

}

const isObject = (obj: any): boolean => {

    if (!obj || typeof obj != 'object' || Array.isArray(obj)) return false

    return true

}

const isCircularDependency = (data: any): any => {

    try {
        JSON.stringify(data);
        return removeDollarSignFromObject(data)
    }
    catch (e) {
        return "Objeto circular detectado"
    }
}


const validateCPF = (cpf?: string) => {

    if (!cpf || typeof cpf != 'string') return false

    cpf = cpf?.replace?.(/\D/g, '')

    if (cpf?.length != 11) return false

    return cpf?.substring(0, 3) + "." + cpf?.substring(3, 6) + "." + cpf?.substring(6, 9) + "-" + cpf?.substring(9)
}

const validateDate = (str: string) => {

    if (!str || typeof str != 'string') {
        console.log("invalida date")
        return false
    }

    if (str?.replace(/\D/g, '').length != 8 || str.length != 10) {
        console.log("invalida date")
        return false
    }

    if (str?.split("-")?.[0]?.length == 2) {
        str = str.split("-").reverse().join("-")
    }

    return str

}

const safeStringify = (dados) => {

    try {

        return JSON.stringify(dados)

    } catch (err) {

        const { message, stack } = err || {}

        return typeof message == 'string' ? message : "Erro fatal ao JSON.stringify data"
    }

}

const validAuthorization = (headers: any) => {

    let authorization = headers?.["authorization"]
    const userAgent = headers?.["user-agent"]
    const fromService = headers?.["x-zoho-fromservice"]

    if (!authorization || typeof authorization != 'string') return false
    if (!userAgent?.toLowerCase?.()?.includes?.("deluge")) return false
    if (!fromService?.toLowerCase?.()?.includes?.("zoho")) return false

    authorization = Buffer.from(authorization, 'base64')?.toString?.()
    authorization = authorization?.split?.("")?.reverse?.()?.join?.("")

    let decodedKey = "test"

    return SECRET_KEY === decodedKey

}

const removeDollarSignFromObject = (data) => {

    if (!data) return null

    try {

        data = JSON.stringify(data)

        data = data.replace(/\$/g, "")

        return JSON.parse(data)

    } catch (err) {

        const { message, stack } = err || {}

        return typeof message == 'string' ? message : "Não foi posivel remover os sinais de $ da entidade"

    }

}

const validaNumero = (numero: any): boolean => {

    if (typeof numero !== "number" || (!numero && numero !== 0)) {
        return false
    }

    return true
}

const delay = async (time = 1000) => new Promise((resolve) => setTimeout(resolve, time))

export {
    responseController,
    splitAtCapitalLetter,
    checkForInvalidStrings,
    validateCPF,
    validateDate,
    delay,
    errorStruct,
    isCircularDependency,
    validAuthorization,
    removeDollarSignFromObject,
    validaNumero,
    safeStringify,
    isObject
}