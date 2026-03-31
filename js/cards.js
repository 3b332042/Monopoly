export const CHANCE_CARDS = [
    { id: 'ch_1', text: "坐飛機去旅行，前進 5 格", type: 'move', value: 5 },
    { id: 'ch_2', text: "因為超速被開罰單，支付 $1000", type: 'money', value: -1000 },
    { id: 'ch_3', text: "中樂透了！獲得 $2000", type: 'money', value: 2000 },
    { id: 'ch_4', text: "回到起點，領取 $2000", type: 'moveto', value: 0 }, // ID 0 is GO
    { id: 'ch_5', text: "直接去坐牢，不領錢", type: 'jail' },
    { id: 'ch_6', text: "有人生日，每人給你 $500", type: 'collect', value: 500 }, // Special: collect from others
    { id: 'ch_7', text: "退後 3 格", type: 'move', value: -3 },
    { id: 'ch_8', text: "去台北車站 (ID: 5)", type: 'moveto', value: 5 }
];

export const CHEST_CARDS = [
    { id: 'cc_1', text: "銀行分紅，獲得 $500", type: 'money', value: 500 },
    { id: 'cc_2', text: "身體不適看急診，支付 $1500", type: 'money', value: -1500 },
    { id: 'cc_3', text: "遺產繼承，獲得 $1000", type: 'money', value: 1000 },
    { id: 'cc_4', text: "小確幸！撿到 $200", type: 'money', value: 200 },
    { id: 'cc_6', text: "直接送去坐牢", type: 'jail' },
    { id: 'cc_7', text: "支付保險費 $1500", type: 'money', value: -1500 },
    { id: 'cc_8', text: "中發票了！獲得 $1000", type: 'money', value: 1000 },
    { id: 'cc_10', text: "電腦壞掉啦，維修費 $800", type: 'money', value: -800 },
    { id: 'cc_11', text: "去台北車站 (ID: 5) 逛逛", type: 'moveto', value: 5 },
    { id: 'cc_12', text: "遇到大塞車，後退 3 格", type: 'move', value: -3 },
    { id: 'cc_13', text: "錢包遺失！損失 $2000", type: 'money', value: -2000 },
    { id: 'cc_14', text: "繳納奢侈稅 $3000", type: 'money', value: -3000 },
    { id: 'cc_15', text: "投資失敗，支付 $2500", type: 'money', value: -2500 }
];
