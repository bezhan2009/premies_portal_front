const formattedTransactions = [
    {
        "TXTDSCR": "Old",
        "DOCDOPER": "2026-05-22",
        "EXECDT": "07:58:31"
    },
    {
        "TXTDSCR": "New",
        "DOCDOPER": "2026-05-22",
        "EXECDT": "13:04:04"
    }
];

formattedTransactions.sort((a, b) => {
    const dateAStr = a.DOCDOPER ? `${a.DOCDOPER}T${a.EXECDT || "00:00:00"}` : "1970-01-01T00:00:00";
    const dateBStr = b.DOCDOPER ? `${b.DOCDOPER}T${b.EXECDT || "00:00:00"}` : "1970-01-01T00:00:00";
    const dateA = new Date(dateAStr).getTime();
    const dateB = new Date(dateBStr).getTime();
    return dateB - dateA; // Newest first
});

console.log(formattedTransactions);
