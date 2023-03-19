import { safeStringify } from "./helpers";

const nonBase64Chars = ["#", "!", "$", "*", ">", "<", "@"];

const base64 = (varsObj: { str: string, decode?: boolean }): string => {

    let { str, decode } = varsObj || {}

    if (!str || typeof str != 'string') return ""
    return Buffer?.from?.(str, decode ? "base64" : undefined)?.toString?.(decode ? undefined : 'base64')
}

const reverte = (varsObj: { str: string }): string => {

    let { str } = varsObj || {}

    if (!str || typeof str != 'string') return ""
    return str.split("").reverse().join("")
}

const base64VezesNum = (varsObj: { str: string, decode?: boolean, num: number }): string => {

    let { str, decode, num } = varsObj || {}

    if (!Number(num) || num < 0) return ""
    if (!str || typeof str != 'string') return ""

    for (let i = 0; i < num; i++) str = base64({ str, decode });

    return str

}

function randomNumber(minimum, maximum): number {
    if ([minimum, maximum].some((e) => !Number(e) && e !== 0)) return 0
    return Math.round(Math.random() * (maximum - minimum) + minimum);
}

const criptografiaTipo2 = (varsObj: { str: string, decode?: boolean }): string => {

    const { decode } = varsObj || {}

    const hashMap: ((e: string, decode?: boolean) => string)[] = [
        (e, d) => base64({ str: e, decode: d }),
        (e, d) => base64({ str: e, decode: d }),
        (e, d) => reverte({ str: e }),
        (e, d) => base64VezesNum({ str: e, decode: d, num: 5 })
    ]

    let str = varsObj?.str;

    if (!str || typeof str != 'string') return "invalid str parameter"

    try {

        if (!decode) {

            let hashed = str

            for (const fun of hashMap) hashed = fun(hashed);

            if (!hashed || typeof hashed != 'string') return "error hashing"

            return hashed
        }

        let unhashed = str

        for (const fun of hashMap.reverse()) unhashed = fun(unhashed, decode);

        if (!unhashed || typeof unhashed != 'string') return "error unhashing"

        return unhashed

    } catch (err) {

        return safeStringify(err)

    }

}


export {
    criptografiaTipo2
}