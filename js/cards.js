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
    { id: 'cc_2', text: "看醫生花了 $500", type: 'money', value: -500 },
    { id: 'cc_3', text: "遺產繼承，獲得 $1000", type: 'money', value: 1000 },
    { id: 'cc_4', text: "被強制徵收土地稅，房屋每棟 $400", type: 'tax_building', value: 400 }, // Logic for this needs implementation, simplify for now
    { id: 'cc_5', text: "出獄許可證", type: 'jail_free' }, // Logic needs implementation
    { id: 'cc_6', text: "直接去坐牢", type: 'jail' },
    { id: 'cc_7', text: "支付保險費 $1500", type: 'money', value: -1500 },
    { id: 'cc_8', text: "撿到錢 $100", type: 'money', value: 100 }
];
