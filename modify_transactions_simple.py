import re

with open('src/components/dashboard/dashboard_operator/processing/Transactions.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

payid_col = '''{
        title: "Оплата телефоном",
        dataIndex: "payId",
        key: "payId",
        width: 150,
        render: (value) => value == "216" ? "GooglePay" : value || "N/A",
      },'''

content = content.replace(
    '{ title: "Статус",',
    f'{payid_col}\n      {{\n        title: "Статус",'
)

with open('src/components/dashboard/dashboard_operator/processing/Transactions.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Transactions.jsx updated')
