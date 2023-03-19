import { any } from "bluebird"
import * as mongoose from "mongoose"

const zohoTokens = new mongoose.Schema({
    environment: {
        type: String,
        required: true,
        unique: true
    },
    refreshToken: {
        type: String,
        required: true
    },
    scope: {
        type: String,
        required: true
    }
})

const registroErrosSchema = new mongoose.Schema({
    idRecord: {
        type: String,
        required: true,
        unique: false
    },
    moduleName: {
        type: String,
        required: true,
        unique: false
    },
    time: {
        type: Date,
        required: true,
        unique: false
    },
    error:{
        type:String,
        required:true,
        unique: false
    },
    data:{
        type:mongoose.Schema.Types.Mixed,
        required:true,
        unique:false
    }
})

const registrosSucessosSchema = new mongoose.Schema({
    idRecord: {
        type: String,
        required: true,
        unique: false
    },
    moduleName: {
        type: String,
        required: true,
        unique: false
    },
    time: {
        type: Date,
        required: true,
        unique: false
    },
    message:{
        type:String,
        required:true,
        unique: false
    },
    data:{
        type:mongoose.Schema.Types.Mixed,
        required:true,
        unique:false
    }
})

export const registrosSucessosRepository = mongoose.model("registros-sucessos", registrosSucessosSchema)

export const registrosErrosRepository = mongoose.model("registros-erros", registroErrosSchema)

export const zohoTokensRepository = mongoose.model("zoho-tokens", zohoTokens)
