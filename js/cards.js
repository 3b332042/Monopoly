export const CHANCE_CARDS = [
    // 正面 (6)
    { id: 'ch_1', text: "坐飛機去旅行，前進 5 格", type: 'move', value: 5 },
    { id: 'ch_2', text: "中樂透了！獲得 $2000", type: 'money', value: 2000 },
    { id: 'ch_3', text: "回到起點，領取 $2000", type: 'moveto', value: 0 },
    { id: 'ch_4', text: "有人生日，每人給你 $500", type: 'collect', value: 500 },
    { id: 'ch_5', text: "投資獲利，領取股利 $1500", type: 'money', value: 1500 },
    { id: 'ch_11', text: "劫富濟貧！<br>從對手那裡獲得 $2000", type: 'steal', value: 2000 },

    // 負面 (6)
    { id: 'ch_6', text: "因為超速被開罰單，支付 $1000", type: 'money', value: -1000 },
    { id: 'ch_7', text: "直接去坐牢，不領錢", type: 'jail' },
    { id: 'ch_8', text: "遇到大塞車，後退 3 格", type: 'move', value: -3 },
    { id: 'ch_9', text: "繳納保險費用 $1500", type: 'money', value: -1500 },
    { id: 'ch_10', text: "手機螢幕碎裂，維修費 $1000", type: 'money', value: -1000 },
    { id: 'ch_13', text: "拆除大隊！<br>拆除一名對手的一級建築", type: 'demolish' }
];

export const CHEST_CARDS = [
    // 正面 (6)
    { id: 'cc_1', text: "銀行分紅，獲得 $1000", type: 'money', value: 1000 },
    { id: 'cc_2', text: "遺產繼承，獲得 $2000", type: 'money', value: 2000 },
    { id: 'cc_3', text: "小確幸！在路上撿到 $500", type: 'money', value: 500 },
    { id: 'cc_4', text: "中發票了！獲得 $1000", type: 'money', value: 1000 },
    { id: 'cc_5', text: "退稅支票寄達，獲得 $1500", type: 'money', value: 1500 },
    { id: 'cc_11', text: "檢舉達人！<br>每位對手向你支付 $800 罰金", type: 'fine_all', value: 800 },

    // 負面 (6)
    { id: 'cc_6', text: "身體不適看急診，支付 $1500", type: 'money', value: -1500 },
    { id: 'cc_7', text: "錢包遺失！損失 $2000", type: 'money', value: -2000 },
    { id: 'cc_8', text: "電腦壞掉啦，維修費 $800", type: 'money', value: -800 },
    { id: 'cc_9', text: "繳納奢侈稅 $3000", type: 'money', value: -3000 },
    { id: 'cc_10', text: "投資失敗，支付 $2500", type: 'money', value: -2500 },
    { id: 'cc_12', text: "強力通緝！<br>一名對手被送進監獄", type: 'jail_victim' }
];
