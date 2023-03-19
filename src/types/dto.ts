interface ResponseData {
    error?: string
}
interface ResponseType {
    message: string,
    error: boolean,
    data: {},
    status: number
}

interface ErrorStruct {
    error: string | false,
    data?: {[key:string]:any},
    func: string
}

interface SuccessStruct {
    error: false,
    data?: any
}

interface ZohoTokenStruct {
    environment: "prod" | "dev",
    refreshToken: string,
    scope: string
}

export {
    ResponseData,
    ResponseType,
    ErrorStruct,
    SuccessStruct,
    ZohoTokenStruct
}