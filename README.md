# Starter Project for integrating Zoho CRM

## CONFIGURATIONS

Configure the MONGODB_URI, ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET in your .env file. You can also replace the MongoDB interface with other database of your wish. Just keep the Zoho Token schema as it is.

On ZohoTypesGenerator.ts file configure in the 'modulosUsados' variable array the modules API_NAMES you want to mount the types from, by default it will fetch and write the modules Leads, Accounts, Contacts and Tasks.

On Zoho collection.ts file configure the access token quantity to be used. Defaults to 5 on prod and 1 on test/local

Create an entity as the schema base in database/repositories to store your refresh token previously created. The Zoho Api Collection will create X amount of access tokens in a queue. Each request will consume the first access token in the array and put it to the end of the array.

## Project setup
```
npm install
```

### Compiles the server
```
npm run start
```

### Fetch and update ZOHO-ENTIDADES-TYPES.TS file with the most recent fields from your Zoho CRM
```
npm run update-zoho-types
```

### Run tests
```
npm run test
```

### Extras
```
criptography basic system file

helpers file with validators, delay function and function return pattern

overwrites global console.log with void function on prod environment(setup at config file)

pre configured DB schemas for errors and success

pre configured Types for HTTP responses and function returns
```
