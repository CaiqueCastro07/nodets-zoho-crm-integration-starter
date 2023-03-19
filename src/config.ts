import logger from "./util/logger";
import ZohoTypesGenerator from "./ExternalApis/Zoho/ZohoTypesGenerator";

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            NODE_ENV?: 'local' | 'prod' | 'update_zoho_types';
        }
    }
}
export function config() {

    const { cwd, env } = process || {}

    const rootFolder = cwd?.()

    if (rootFolder?.includes?.("usr/app")) {
        process.env.NODE_ENV = "prod"
    };

    const { NODE_ENV } = env || {}

    if (NODE_ENV?.toLowerCase?.() == "update_zoho_types") {
        // npm run update-zoho-types - para atualizar o arquivo zoho-entidades-types.ts com os campos mais recentes
        new ZohoTypesGenerator().atualizaCamposDisponiveis()

        logger.info(`Comando de atualização de Types do Zoho acionado, irá atualizar o arquivo 'zoho-entidades-types.ts' com os campos mais recentes.`)
        return
    }

}