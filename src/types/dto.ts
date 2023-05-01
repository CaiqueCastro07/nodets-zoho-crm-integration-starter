interface ResponseData {
    error?: string
}
interface ResponseType {
    message: string,
    error: boolean,
    data: {},
    status: number
}

type ReturnStruct<T> = {
    error: string,
    data: Record<string, any>,
    func: string
} | {
    error: false,
    data?: T
}

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