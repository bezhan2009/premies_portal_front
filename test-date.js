const parseTxDate = (tx) => {
    let d = tx.DOCDOPER ? tx.DOCDOPER.trim() : "";
    let t = tx.EXECDT ? tx.EXECDT.trim() : "00:00:00";
    if (!d) return 0;
    
    if (d.includes(".")) {
        const parts = d.split(".");
        let year = parts[2];
        if (year.length === 2) year = `20${year}`;
        d = `${year}-${parts[1]}-${parts[0]}`;
    }
    
    const timeVal = new Date(`${d}T${t}`).getTime();
    return isNaN(timeVal) ? 0 : timeVal;
};

console.log(parseTxDate({ DOCDOPER: "22.05.26", EXECDT: "13:04:04" }));
console.log(parseTxDate({ DOCDOPER: "22.05.2026", EXECDT: "13:04:04" }));
console.log(parseTxDate({ DOCDOPER: "2026-05-22", EXECDT: "13:04:04" }));
