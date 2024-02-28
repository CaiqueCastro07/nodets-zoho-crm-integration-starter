interface ResponseData {
    error?: string
}
interface ResponseType {
    message: string,
    error: boolean,
    data: {},
    status: number
}

type ReturnStruct<T> = [null, T] | [Error, null]

interface ZohoTokenStruct {
    environment: "prod" | "dev",
    refreshToken: string,
    scope: string
}

export {
    ResponseData,
    ResponseType,
    ReturnStruct,
    ZohoTokenStruct
}