import { ReturnStruct } from "../../types/dto";
import { delay, errorStruct } from "../../util/helpers"
import { } from "../../database/databaseServices"
import ZohoApiCollection from "../../ExternalApis/Zoho/collection"
import * as moment from "moment-timezone";

class Entidade extends ZohoApiCollection {
    recordId: string
    constructor(varsObj: { recordId: string }) {

        super();
        const { recordId } = varsObj || {}

        this.recordId = recordId

    }

    async primeiraFuncao(): Promise<ReturnStruct<{ data: string }>> {

        const { name: funcName } = this.primeiraFuncao || {}
        // store data as u wish from the operation
        const storeData = {
            data: undefined
        }

        if (!this.recordId || typeof this.recordId != 'string') return errorStruct(funcName, "The record id is valid", { recordId: this.recordId })

        return { error: false, data: storeData }

    }

}

export default Entidade