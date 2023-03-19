import logger from "./logger";
import * as dotenv from "dotenv"
import * as fs from "fs"

if (fs.existsSync(".env")) {
    logger.debug("Using .env file to supply config environment variables");
    dotenv.config({ path: '.env' });
} else {
    logger.debug("Using .env file to supply config environment variables");
}

export const MONGODB_URI = process?.env?.["MONGODB_URI"]
export const SECRET_KEY = process?.env?.["SECRET_KEY"]
export const ZOHO_CLIENT_ID = process?.env?.["ZOHO_CLIENT_ID"]
export const ZOHO_CLIENT_SECRET = process?.env?.["ZOHO_CLIENT_SECRET"]


if (!MONGODB_URI || typeof MONGODB_URI != 'string') {
    logger.error("No mongo connection string. Set MONGODB_URI environment variable.");
    process.exit(1);
}

if ([ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET].some((e) => !e || typeof e != 'string')) {
    logger.error("Invalid ZOHO_CLIENT_ID or ZOHO_CLIENT_SECRET on environment variable.");
    process.exit(1);
}
