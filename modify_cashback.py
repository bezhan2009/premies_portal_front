import re

with open('src/pages/dashboard/dashboard_cashback/CardCashbackTable.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add balance state
content = content.replace(
    'const [error, setError] = useState(null);',
    'const [error, setError] = useState(null);\n    const [balance, setBalance] = useState(null);'
)

# 2. Fetch balance in useEffect
content = re.sub(
    r'useEffect\(\(\) => \{\s+fetchItems\(\);\s+\}, \[fetchItems\]\);',
    '''useEffect(() => {
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
    }, [fetchItems]);''',
    content
)

# 3. Update columns: amount -> cashback_amount, add 'Сумма операции' and 'Сумма списания'
old_cols = '''            {
                title: "Сумма кэшбэка",
                dataIndex: "amount",
                key: "amount",
                sorter: (a, b) => a.amount - b.amount,
                render: (val, record) => `${val} ${getCurrencyCode(String(record.currency || ""))}`,
            },'''
new_cols = '''            {
                title: "Сумма кэшбэка",
                dataIndex: "cashback_amount",
                key: "cashback_amount",
                sorter: (a, b) => (a.cashback_amount || a.amount) - (b.cashback_amount || b.amount),
                render: (val, record) => `${val || record.amount} ${getCurrencyCode(String(record.currency || ""))}`,
            },
            {
                title: "Сумма операции",
                dataIndex: "amount",
                key: "amount",
                sorter: (a, b) => a.amount - b.amount,
                render: (val, record) => `${val} ${getCurrencyCode(String(record.currency || ""))}`,
            },
            {
                title: "Сумма списания",
                dataIndex: "conamt",
                key: "conamt",
                sorter: (a, b) => a.conamt - b.conamt,
                render: (val, record) => `${val || 0} ${getCurrencyCode(String(record.concurrency || ""))}`,
            },'''
content = content.replace(old_cols, new_cols)

# 4. Add PayID column after 'Статус'
status_col_regex = r'(\{\s*title: "Статус"[\s\S]*?render: \(val\) => \{[\s\S]*?\},?\s*\},)'
content = re.sub(status_col_regex, r'\1\n            {\n                title: "Оплата телефоном",\n                dataIndex: "payId",\n                key: "payId",\n                render: (val) => (val == "216" ? "GooglePay" : val || ""),\n            },', content)

# 5. Add balance to UI
ui_title_regex = r'<div className="table-header-actions" style=\{\{ margin: "16px" \}\}>\s*<h2>Кэшбэк по картам<\/h2>'
new_title = '''<div className="table-header-actions" style={{ margin: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <h2 style={{ margin: 0 }}>Кэшбэк по картам</h2>
                    {balance !== null && (
                        <Tag color="blue" style={{ fontSize: "16px", padding: "4px 8px" }}>
                            Остаток по счету: {balance} TJS
                        </Tag>
                    )}
                </div>'''
content = re.sub(ui_title_regex, new_title, content)

with open('src/pages/dashboard/dashboard_cashback/CardCashbackTable.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('CardCashbackTable.jsx updated')
