const fs = require('fs');
const path = require('path');

const cardCashbackTablePath = path.join(__dirname, 'src', 'pages', 'dashboard', 'dashboard_cashback', 'CardCashbackTable.jsx');
let content = fs.readFileSync(cardCashbackTablePath, 'utf8');

// 1. Add balance state
content = content.replace(
    'const [error, setError] = useState(null);',
    'const [error, setError] = useState(null);\n    const [balance, setBalance] = useState(null);'
);

// 2. Fetch balance in useEffect
const useEffectRegex = /useEffect\(\(\) => \{\s+fetchItems\(\);\s+\}, \[fetchItems\]\);/;
content = content.replace(useEffectRegex, `useEffect(() => {
        fetchItems();
        
        const fetchBalance = async () => {
            try {
                const res = await fetch("http://10.64.1.10/services/bal.php?acc=26202972190810638243");
                const text = await res.text();
                const data = JSON.parse(text);
                if (data && data.length > 0) {
                    setBalance(data[0].bal);
                }
            } catch (e) {
                console.error("Ошибка при получении баланса:", e);
            }
        };
        fetchBalance();
    }, [fetchItems]);`);

// 3. Update columns: amount -> cashback_amount, add 'Сумма операции' and 'Сумма списания'
const amountColumnStr = `{
                title: "Сумма кэшбэка",
                dataIndex: "amount",
                key: "amount",
                sorter: (a, b) => a.amount - b.amount,
                render: (val, record) => \`\${val} \${getCurrencyCode(String(record.currency || ""))}\`,
            },`;
const newColumns = `{
                title: "Сумма кэшбэка",
                dataIndex: "cashback_amount",
                key: "cashback_amount",
                sorter: (a, b) => (a.cashback_amount || a.amount) - (b.cashback_amount || b.amount),
                render: (val, record) => \`\${val || record.amount} \${getCurrencyCode(String(record.currency || ""))}\`,
            },
            {
                title: "Сумма операции",
                dataIndex: "amount",
                key: "amount",
                sorter: (a, b) => a.amount - b.amount,
                render: (val, record) => \`\${val} \${getCurrencyCode(String(record.currency || ""))}\`,
            },
            {
                title: "Сумма списания",
                dataIndex: "conamt",
                key: "conamt",
                sorter: (a, b) => a.conamt - b.conamt,
                render: (val, record) => \`\${val || 0} \${getCurrencyCode(String(record.concurrency || ""))}\`,
            },`;
content = content.replace(amountColumnStr, newColumns);

// 4. Add PayID column after 'Статус'
const statusColumnRegex = /(\{\s*title: "Статус"[\s\S]*?render: \(val\) => \{[\s\S]*?\},?\s*\},)/;
content = content.replace(statusColumnRegex, `$1
            {
                title: "Оплата телефоном",
                dataIndex: "payId",
                key: "payId",
                render: (val) => (val == "216" ? "GooglePay" : val || ""),
            },`);

// 5. Add balance to UI
const uiTitleRegex = /<div className="table-header-actions" style=\{\{ margin: "16px" \}\}>\s*<h2>Кэшбэк по картам<\/h2>/;
content = content.replace(uiTitleRegex, `<div className="table-header-actions" style={{ margin: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <h2 style={{ margin: 0 }}>Кэшбэк по картам</h2>
                    {balance !== null && (
                        <Tag color="blue" style={{ fontSize: "16px", padding: "4px 8px" }}>
                            Остаток по счету: {balance} TJS
                        </Tag>
                    )}
                </div>`);

fs.writeFileSync(cardCashbackTablePath, content);
console.log('CardCashbackTable updated');
