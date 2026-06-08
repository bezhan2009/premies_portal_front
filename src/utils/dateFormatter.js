export const formatDateDisplay = (dateString) => {
    if (!dateString || dateString === "-") return dateString;
    
    // Check if it's YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
    const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}:\d{2}:\d{2}))?(?:\.\d+)?Z?$/);
    
    if (match) {
        const [_, year, month, day, time] = match;
        if (time) {
            return `${day}.${month}.${year} ${time}`;
        }
        return `${day}.${month}.${year}`;
    }
    
    return dateString;
};
