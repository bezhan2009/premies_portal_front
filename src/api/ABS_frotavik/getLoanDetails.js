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
    // Try with namespace first
    let el = parent.getElementsByTagNameNS(LOANS_NS, tagName);
    if (el.length > 0) return el[0].textContent;

    // Fallback to local name (some SOAP responses might not properly namespace all child nodes)
    el = parent.getElementsByTagName(tagName);
    if (el.length > 0) return el[0].textContent;

    // Fallback searching with prefix if any
    const all = parent.getElementsByTagName("*");
    for (let i = 0; i < all.length; i++) {
      const node = all[i];
      if (node.localName === tagName) return node.textContent;
    }

    return "";
  };

  // Helper to find first matching element regardless of namespace if needed,
  // but Colvir usually respects namespaces.

  const findRoot = () => {
    const rootNames = [
      "loadLoanDetailsResponse",
      "loadLoanDetailsResponseElem",
    ];
    for (const name of rootNames) {
      let r = xmlDoc.getElementsByTagNameNS("*", name)[0];
      if (r) return r;
      r = xmlDoc.getElementsByTagName(name)[0];
      if (r) return r;
    }

    // Fallback: finding any element that ends with loadLoanDetailsResponse
    const all = xmlDoc.getElementsByTagName("*");
    for (let i = 0; i < all.length; i++) {
      if (all[i].localName.includes("loadLoanDetailsResponse")) return all[i];
    }
    return null;
  };

  const root = findRoot();
  if (!root) return null;

  // Extract Params
  const params = {
    referenceId:
      getElementValue(root, "referenceId") ||
      getElementValue(root, "colvirReferenceId"),
    contractNumber: getElementValue(root, "contractNumber"),
    statusName: getElementValue(root, "statusName"),
    productName: getElementValue(root, "productName"),
    creditPurpose: getElementValue(root, "creditPurpose"),
    amount: getElementValue(root, "amount"),
    currency: getElementValue(root, "currency"),
    documentDate: getElementValue(root, "documentDate"),
    term: getElementValue(root, "term"),
    startDate: getElementValue(root, "startDate"),
    endDate: getElementValue(root, "endDate"),
    department: getElementValue(root, "department"),
    clientDea: getElementValue(root, "clientDea"),
    balanceAccount: getElementValue(root, "balanceAccount"),
    earlyRepayment: getElementValue(root, "earlyRepayment"),
    paymentDay: getElementValue(root, "paymentDay"),
    penalty: getElementValue(root, "penalty"),
    interestRate: getElementValue(root, "interestRate"),
    creditExperts: getElementValue(root, "creditExperts"),
  };

  // Extract Balances (Analytical accounts)
  const balanceNodes = xmlDoc.getElementsByTagNameNS("*", "balanceAccount");
  const balances = Array.from(balanceNodes).map((node) => ({
    code: getElementValue(node, "code") || getElementValue(node, "nps"), // Fallback to nps if code is missing
    nps: getElementValue(node, "nps"),
    accCode: getElementValue(node, "accCode"),
    balance: getElementValue(node, "balance"),
    currCode: getElementValue(node, "currCode"),
    activeFl: getElementValue(node, "activeFl"),
    colvirReferenceId: getElementValue(node, "colvirReferenceId"),
  }));

  // Extract Payment Options
  const accountNodes = xmlDoc.getElementsByTagNameNS("*", "paymentOption");
  const paymentOptions = Array.from(accountNodes).map((node) => ({
    code: getElementValue(node, "code"),
    name: getElementValue(node, "name"),
    account: getElementValue(node, "account"),
    colvirReferenceId: getElementValue(node, "colvirReferenceId"),
  }));

  return { params, balances, paymentOptions };
}

export async function fetchLoanDetails(referenceId) {
  try {
    const soapRequest = buildLoanDetailsSoapRequest(referenceId);
    const response = await fetch("/api/loans", {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: "loadLoanDetails",
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
        SOAPAction: "repayLoanEarly",
      },
      body: soapRequest,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const xmlText = await response.text();
    console.log("Response from repayLoanSoap:", xmlText);
    // For now returning true if OK, as the user didn't specify parsing for response
    return true;
  } catch (error) {
    console.error("Error in repayLoanSoap:", error);
    throw error;
  }
}
