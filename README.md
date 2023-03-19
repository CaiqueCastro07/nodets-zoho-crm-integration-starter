# Starter Project for integrating Zoho CRM

## CONFIGURATIONS

Configure the MONGODB_URI, ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET in your .env file. You can also replace the MongoDB interface with other database of your wish. Just keep the Zoho Token schema as it is.

On ZohoTypesGenerator.ts file configure in the 'modulosUsados' variable array the modules API_NAMES you want to mount the types from, by default it will fetch and write the modules Leads, Accounts, Contacts and Tasks.

Create an entity as the schema base in database/repositories to store your refresh token previously created. The Zoho Api Collection will create X amount of access tokens in a queue. Each request will consume the first access token in the array and put it to the end of the array.

## Project setup
```
npm install
```

### Compiles the server
```
npm run start
```

### Fetch and update ZOHO-ENTIDADES-TYPES.TS file 
```
npm run update-zoho-types
```

### Run tests
```
npm run test
```
