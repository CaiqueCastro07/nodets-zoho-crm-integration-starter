//ultima atualização do arquivo as 19/03/2023 - 12:12:00

// npm run update-zoho-types - para atualizar o arquivo zoho-entidades-types.ts com os campos mais recentes

type PrependNextNum<A extends Array<unknown>> = A['length'] extends infer T ? ((t: T, ...a: A) => void) extends ((...x: infer X) => void) ? X : never : never;

type EnumerateInternal<A extends Array<unknown>, N extends number> = { 0: A, 1: EnumerateInternal<PrependNextNum<A>, N> }[N extends A['length'] ? 0 : 1];

export type Enumerate<N extends number> = EnumerateInternal<[], N> extends (infer E)[] ? E : never;

export type Range<FROM extends number, TO extends number> = Exclude<Enumerate<TO>, Enumerate<FROM>>;

type MS = Range<0, 60>;

type HR = Range<0, 24>;

type ZeroToNine = Range<0, 10>;

type OneToNine = Range<1, 10>;
type YYYY = `19${ZeroToNine}${ZeroToNine}` | `20${ZeroToNine}${ZeroToNine}`;
type MM = `0${OneToNine}` | `1${0 | 1 | 2};`
type DD = `${0}${OneToNine}` | `${1 | 2}${OneToNine}` | `3${0 | 1}`;
type DateZoho = `${YYYY}-${MM}-${DD}` | string;
type DateTimeZoho = string;
interface Leads {
   id?: string,
   First_Name?: string,
   Salutation?: null | "Dr." | "Prof." | "Sr." | "Sra." | "Srta.",
   Email?: string,
   Last_Name?: string,
   Full_Name?: string,
   Secondary_Email?: string,
   Phone?: string,
   Tipo_de_Pessoa?: null | "Física" | "Jurídica",
   Mobile?: string,
   Company?: string,
   Created_Time?: DateTimeZoho,
   Modified_By?: { id: string },
   Last_Enriched_Time__s?: DateTimeZoho,
   Tag?: { id: string, name?: string }[],

   Unsubscribed_Time?: DateTimeZoho,
   Modified_Time?: DateTimeZoho,
   Last_Activity_Time?: DateTimeZoho,
   Converted_Account?: { id: string, name?: string },
   Converted_Deal?: { id: string, name?: string },
   Lead_Conversion_Time?: number,
   Converted_Contact?: { id: string, name?: string },
   facebookadvertmanager__Facebook_Ad?: { id: string, name?: string },
   OwnerID?: string,
   Click_Type?: "Breadcrumbs" | "Driving direction" | "Get location details" | "Headline" | "Manually dialed phone calls" | "Mobile phone calls" | "Other" | "Phone calls" | "Print offer" | "Product listing ad" | "Product plusbox offer" | "Sitelink" | "unknown",
   Device_Type?: "Computers" | "Mobile devices with full browsers" | "Other" | "Tablets with full browsers",
   Ad_Network?: "Display Network" | "Search Network",
   Search_Partner_Network?: "Display Network" | "Google search" | "Search partners",
   Ad_Campaign_Name?: string,
   AdGroup_Name?: string,
   Ad?: string,
   GADCONFIGID?: string,
   Ad_Click_Date?: DateZoho,
   Cost_per_Click?: number,
   Cost_per_Conversion?: number,
   Conversion_Exported_On?: DateTimeZoho,
   Conversion_Export_Status?: null | "Failure" | "NA - Invalid" | "Not started" | "Success",
   Reason_for_Conversion_Failure?: null | "CLICK_MISSING_CONVERSION_LABEL" | "CONVERSION_PRECEDES_CLICK" | "EXPIRED_CLICK" | "FUTURE_CONVERSION_TIME" | "INVALID_CONVERSION_TYPE" | "TOO_RECENT_CLICK" | "UNKNOWN" | "UNPARSEABLE_GCLID"
}

interface Contacts {
   id?: string,
   First_Name?: string,
   Salutation?: null | "Dr." | "Prof." | "Sr." | "Sra." | "Srta.",
   Last_Name?: string,
   Full_Name?: string,
   Email?: string,
   Secondary_Email?: string,
   Account_Name?: { id: string, name?: string },
   Phone?: string,
   Modified_Time?: DateTimeZoho,
   Created_Time?: DateTimeZoho,
   Last_Activity_Time?: DateTimeZoho,
   Last_Enriched_Time__s?: DateTimeZoho,
   Enrich_Status__s?: "Available" | "Data not found" | "Enriched",
   Mailing_Zip?: string,
   Complemento_de_Correspond_ncia?: string,
   Mailing_Street?: string,
   Mailing_City?: string,
   Mailing_State?: string,
   Mailing_Country?: string,
   OwnerID?: string,
   Home_Phone?: string,
   Other_Phone?: string,
   Email_Usu_rio?: string,
   Owner?: { id: string },
   Unsubscribed_Mode?: "Formulário de consentimento" | "Manual" | "Link de cancelamento" | "Zoho Campaigns",
   Unsubscribed_Time?: DateTimeZoho,
   Ad_Campaign_Name?: string,
   AdGroup_Name?: string,
   Ad?: string,
   GADCONFIGID?: string,
   Ad_Click_Date?: DateZoho,
   Cost_per_Click?: number,
   Cost_per_Conversion?: number,
   Conversion_Exported_On?: DateTimeZoho,
   Conversion_Export_Status?: null | "Failure" | "NA - Invalid" | "Not started" | "Success",
   Reason_for_Conversion_Failure?: null | "CLICK_MISSING_CONVERSION_LABEL" | "CONVERSION_PRECEDES_CLICK" | "EXPIRED_CLICK" | "FUTURE_CONVERSION_TIME" | "INVALID_CONVERSION_TYPE" | "TOO_RECENT_CLICK" | "UNKNOWN" | "UNPARSEABLE_GCLID"
}

interface Accounts {
   id?: string,
   Billing_Code?: string,
   Complemento?: string,
   Billing_Street?: string,
   Billing_City?: string,
   N_mero_de_Cobran_a?: number,
   Billing_State?: string,
   Bairro?: string,
   Owner?: { id: string },
   Modified_By?: { id: string },
   SDR?: { id: string, name?: string },
   Last_Activity_Time?: DateTimeZoho,
   Status?: "Aguardando" | "Concluído" | "Deferido" | "Em Andamento" | "false" | "Não Iniciado" | "Para fazer" | "Redistribuído" | "true",
   Priority?: "Alta" | "Baixa" | "Mais Alta" | "Mais Baixa" | "Normal",
   Created_By?: { id: string },
   Closed_Time?: DateTimeZoho,
   ID_Tarefa?: string,
   Nome_Conta?: string,
   Send_Notification_Email?: boolean,
   Tag?: { id: string, name?: string }[],
   Created_Time?: DateTimeZoho,
   Modified_Time?: DateTimeZoho,
   Description?: string
}

type NomeModulosZoho = "Leads" | "Contacts" | "Accounts" | "Tasks";
type ModulosZoho = Leads | Contacts | Accounts;

export {
   DateTimeZoho,
   DateZoho,
   NomeModulosZoho,
   ModulosZoho,
   Leads,
   Contacts,
   Accounts
}