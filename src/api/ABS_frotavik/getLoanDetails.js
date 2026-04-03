/**
 * API module for fetching loan details from the Colvir SOAP service.
 * Endpoint: /api/loans (proxied to http://10.64.1.55:8180/cxf/loans/v1)
 */

const LOANS_NS = "http://bus.colvir.com/service/loans/v1";

function buildLoanDetailsSoapRequest(referenceId) {
  return `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v1="http://bus.colvir.com/service/loans/v1" xmlns:v11="http://bus.colvir.com/common/support/v1" xmlns:v12="http://bus.colvir.com/common/basis/v1" xmlns:v13="http://bus.colvir.com/common/domain/v1">
   <soapenv:Header/>
   <soapenv:Body>
      <v1:loadLoanDetailsRequest>
         <v12:colvirReferenceId>${referenceId}</v12:colvirReferenceId>
         <v1:detail>
            <v1:analyticalAccounts>1</v1:analyticalAccounts>
            <v1:analyticalAccMovements>1</v1:analyticalAccMovements>
            <v1:balanceAccounts>1</v1:balanceAccounts>
            <v1:sumTypes>1</v1:sumTypes>
            <v1:paymentOptions>1</v1:paymentOptions>
            <v1:consolidationGroups>1</v1:consolidationGroups>
            <v1:deaParams>1</v1:deaParams>
            <v1:coBorrowers>1</v1:coBorrowers>
         </v1:detail>
      </v1:loadLoanDetailsRequest>
   </soapenv:Body>
</soapenv:Envelope>`;
}

function parseLoanDetailsSoapResponse(xmlText) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "text/xml");

  const getElementValue = (parent, tagName) => {
    if (!parent) return "";
    // Try finding by local name in any namespace
    const elements = parent.getElementsByTagName("*");
    for (let i = 0; i < elements.length; i++) {
      if (elements[i].localName === tagName) return elements[i].textContent;
    }
    return "";
  };

  const findElement = (parent, tagName) => {
    if (!parent) return null;
    const elements = parent.getElementsByTagName("*");
    for (let i = 0; i < elements.length; i++) {
      if (elements[i].localName === tagName) return elements[i];
    }
    return null;
  };

  // Find the root response element
  const responseElem = xmlDoc.getElementsByTagNameNS("*", "loadLoanDetailsResponse")[0];
  if (!responseElem) return null;

  // Find the loan element
  const loanElem = findElement(responseElem, "loan");
  if (!loanElem) return null;

  // Find agreementData
  const agreementDataElem = findElement(loanElem, "agreementData");
  
  // Extract Params from agreementData
  const params = {
    referenceId: getElementValue(agreementDataElem, "colvirReferenceId"),
    contractNumber: getElementValue(agreementDataElem, "code"),
    statusName: getElementValue(findElement(agreementDataElem, "status"), "name"),
    productName: getElementValue(findElement(agreementDataElem, "product"), "name"),
    creditPurpose: getElementValue(findElement(agreementDataElem, "purpose"), "name"),
    amount: getElementValue(agreementDataElem, "amount"),
    currency: getElementValue(agreementDataElem, "currency"),
    documentDate: getElementValue(agreementDataElem, "documentDate"),
    term: getElementValue(agreementDataElem, "termTU"),
    startDate: getElementValue(agreementDataElem, "dateFrom"),
    endDate: getElementValue(agreementDataElem, "dateTo"),
    department: getElementValue(findElement(agreementDataElem, "department"), "code"),
    clientDea: getElementValue(findElement(agreementDataElem, "deaClient"), "code"),
    // Add other fields if needed, but these are most important
  };

  // Extract Balances (Balance accounts)
  const balanceAccountsRoot = findElement(loanElem, "balanceAccounts");
  const balanceNodes = balanceAccountsRoot ? balanceAccountsRoot.getElementsByTagName("*") : [];
  const balances = [];
  
  for (let i = 0; i < balanceNodes.length; i++) {
    const node = balanceNodes[i];
    if (node.localName === "balanceAccount") {
      const balance = getElementValue(node, "balance");
      const curr = getElementValue(node, "currCode");
      balances.push({
        code: getElementValue(node, "nps"),
        name: getElementValue(node, "accCode"),
        amount: `${balance} ${curr}`,
        nps: getElementValue(node, "nps"),
        accCode: getElementValue(node, "accCode"),
        balance: balance,
        currCode: curr,
        activeFl: getElementValue(node, "activeFl"),
        colvirReferenceId: getElementValue(node, "colvirReferenceId"),
      });
    }
  }

  // Extract Analytical Accounts (Move them to balances if needed or keep separate)
  // For now, let's keep them in the same list if the UI only has one "Balances" tab
  // Or we can add an 'analyticalAccounts' field to the return object
  const analyticalAccountsRoot = findElement(loanElem, "analyticalAccounts");
  const analyticalNodes = analyticalAccountsRoot ? analyticalAccountsRoot.getElementsByTagName("*") : [];
  const analyticalAccounts = [];
  
  for (let i = 0; i < analyticalNodes.length; i++) {
    const node = analyticalNodes[i];
    if (node.localName === "analyticalAccount") {
      analyticalAccounts.push({
        code: getElementValue(node, "anCode"),
        name: getElementValue(node, "anCode"), // Usually specific codes like CR_AMT
        amount: `${getElementValue(node, "amount")} ${getElementValue(node, "currencyCode")}`,
        sign: getElementValue(node, "sign"),
      });
    }
  }

  // Extract Payment Options
  const paymentOptionsRoot = findElement(loanElem, "paymentOptions");
  const paymentNodes = paymentOptionsRoot ? paymentOptionsRoot.getElementsByTagName("*") : [];
  const paymentOptions = [];
  
  for (let i = 0; i < paymentNodes.length; i++) {
    const node = paymentNodes[i];
    if (node.localName === "paymentOption") {
      paymentOptions.push({
        code: getElementValue(node, "code"),
        name: getElementValue(node, "name"),
        account: getElementValue(node, "account"),
        colvirReferenceId: getElementValue(node, "colvirReferenceId"),
      });
    }
  }

  return { params, balances, analyticalAccounts, paymentOptions };
}

export async function fetchLoanDetails(referenceId) {
  try {
    const soapRequest = buildLoanDetailsSoapRequest(referenceId);
    const response = await fetch("/api/loans", {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: "",
      },
      body: soapRequest,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const xmlText = await response.text();
    return parseLoanDetailsSoapResponse(xmlText);
  } catch (error) {
    console.error("Error fetching loan details:", error);
    throw error;
  }
}

// Helpers for repayment
const generateUUID = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const formatSoapDateTime = (date = new Date()) => {
  return date.toISOString().split(".")[0];
};

const formatSoapDate = (date = new Date()) => {
  return date.toISOString().split("T")[0];
};

function buildRepayLoanSoapRequest({ referenceId, amount, sourceOrdNum }) {
  const requestId = generateUUID();
  const operationalDate = formatSoapDateTime();
  const petitionDate = formatSoapDate();

  return `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v1="http://bus.colvir.com/service/loans/v1" xmlns:v11="http://bus.colvir.com/common/support/v1" xmlns:v12="http://bus.colvir.com/common/basis/v1" xmlns:v13="http://bus.colvir.com/common/domain/v1">
   <soapenv:Header/>
   <soapenv:Body>
      <v1:repayLoanEarlyRequest>
         <v11:head>
            <v11:requestId>${requestId}</v11:requestId>
            <v11:sessionId>1</v11:sessionId>
            <v11:processId>1</v11:processId>
            <v11:params>
               <v11:clientType>CBS</v11:clientType>
               <v11:interfaceVersion>1.0</v11:interfaceVersion>
               <v11:language>ru</v11:language>
               <v11:operationalDate>${operationalDate}</v11:operationalDate>
            </v11:params>
         </v11:head>
         <v12:colvirReferenceId>${referenceId}</v12:colvirReferenceId>
         <v1:amount>${amount}</v1:amount>
         <v1:repayment>ODONLY</v1:repayment>
         <v1:source>A</v1:source>
         <v1:sourceOrdNum>${sourceOrdNum}</v1:sourceOrdNum>
         <v1:petitionDate>${petitionDate}</v1:petitionDate> 
         <v1:petitionNumber>1</v1:petitionNumber>
      </v1:repayLoanEarlyRequest>
   </soapenv:Body>
</soapenv:Envelope>`;
}

export async function repayLoanSoap(repayData) {
  try {
    const soapRequest = buildRepayLoanSoapRequest(repayData);
    const response = await fetch("/api/loans", {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: "",
      },
      body: soapRequest,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const xmlText = await response.text();
    console.log("Response from repayLoanSoap:", xmlText);
    return true;
  } catch (error) {
    console.error("Error in repayLoanSoap:", error);
    throw error;
  }
}

