import axios from "axios";

export const fetchATM = async () => {
    try {
        const response = await axios.get(`${import.meta.env.VITE_BACKEND_ATM_SERVICE_URL}/services/mtm_atm.php`);
        return response?.data?.items ?? [];
    } catch (error) {
        console.error("Error fetching ATM data:", error);
        throw error;
    }
};

export const fetchATMReport = async (atmId, fromDate, toDate) => {
    try {
        const response = await axios.get(
            "/atm-api/services/mtm_atm_report.php",
            {
                params: { atmId, fromDate, toDate },
            }
        );
        return response.data;
    } catch (error) {
        console.error("Error fetching ATM report:", error);
        throw error;
    }
};

export const fetchHistory = async (fromDate, toDate) => {
  try {
    const response = await axios.get(
      "http://10.64.20.84:5003/api/Transactions/search-transactions",
      {
        params: {
          transactionType: 700,
          fromDate,
          toDate,
        },
      }
    );

    console.log(response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching history:", error);
    throw error;
  }
};


