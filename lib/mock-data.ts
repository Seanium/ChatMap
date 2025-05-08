// 模拟数据服务

export const getMockResponse = (query: string) => {
  // 默认模拟响应
  const defaultResponse = {
    text: "我找到了几个与您的查询相关的有趣位置。每个标记代表一个兴趣点，我已经包含了每个位置的相关详细信息。您可以点击标记查看更多信息。如果您想了解更多关于这些地方的信息，或者有其他问题，请随时提问！",
    locations: [
      {
        id: "mock-1",
        title: "模拟位置 1",
        description: "这是第一个模拟位置的描述。",
        latitude: 35.6762,
        longitude: 139.6503,
      },
      {
        id: "mock-2",
        title: "模拟位置 2",
        description: "这是第二个模拟位置的描述。",
        latitude: 35.6897,
        longitude: 139.7006,
      },
      {
        id: "mock-3",
        title: "模拟位置 3",
        description: "这是第三个模拟位置的描述。",
        latitude: 35.7101,
        longitude: 139.8107,
      },
    ],
    error: false,
  }

  // 根据查询关键词返回不同的模拟数据
  if (query.toLowerCase().includes("东京") || query.toLowerCase().includes("tokyo")) {
    return {
      text: "东京是日本的首都，也是世界上最大的城市之一。以下是东京的几个著名景点：\n\n1. 东京塔 - 受艾菲尔铁塔启发的通信和观光塔，是东京的标志性建筑。\n\n2. 明治神宫 - 位于繁华的涩谷区，是一个宁静的神道教圣地。\n\n3. 浅草寺 - 东京最古老的寺庙，以雷门和巨大的红灯笼而闻名。\n\n4. 涩谷十字路口 - 世界上最繁忙的行人十字路口之一，是东京现代都市生活的象征。\n\n5. 上野公园 - 一个大型公园，内有多个博物馆、动物园和美丽的樱花树。",
      locations: [
        {
          id: "tokyo-1",
          title: "东京塔",
          description: "受艾菲尔铁塔启发的通信和观光塔，是东京的标志性建筑。",
          latitude: 35.6586,
          longitude: 139.7454,
        },
        {
          id: "tokyo-2",
          title: "明治神宫",
          description: "位于繁华的涩谷区，是一个宁静的神道教圣地。",
          latitude: 35.6764,
          longitude: 139.6993,
        },
        {
          id: "tokyo-3",
          title: "浅草寺",
          description: "东京最古老的寺庙，以雷门和巨大的红灯笼而闻名。",
          latitude: 35.7147,
          longitude: 139.7966,
        },
        {
          id: "tokyo-4",
          title: "涩谷十字路口",
          description: "世界上最繁忙的行人十字路口之一，是东京现代都市生活的象征。",
          latitude: 35.6595,
          longitude: 139.7004,
        },
        {
          id: "tokyo-5",
          title: "上野公园",
          description: "一个大型公园，内有多个博物馆、动物园和美丽的樱花树。",
          latitude: 35.7151,
          longitude: 139.7734,
        },
      ],
      error: false,
    }
  } else if (query.toLowerCase().includes("北京") || query.toLowerCase().includes("beijing")) {
    return {
      text: "北京是中国的首都，拥有悠久的历史和丰富的文化遗产。以下是北京的几个著名景点：\n\n1. 故宫 - 也称为紫禁城，是中国明清两代的皇家宫殿。\n\n2. 天安门广场 - 世界上最大的城市广场之一，位于北京市中心。\n\n3. 长城 - 世界七大奇迹之一，八达岭是其最受欢迎的部分之一。\n\n4. 颐和园 - 一个巨大的皇家园林和湖泊，是中国园林设计的杰作。\n\n5. 天坛 - 明清两代皇帝祭天的场所，是中国古代建筑的瑰宝。",
      locations: [
        {
          id: "beijing-1",
          title: "故宫",
          description: "也称为紫禁城，是中国明清两代的皇家宫殿。",
          latitude: 39.9163,
          longitude: 116.3972,
        },
        {
          id: "beijing-2",
          title: "天安门广场",
          description: "世界上最大的城市广场之一，位于北京市中心。",
          latitude: 39.9054,
          longitude: 116.3976,
        },
        {
          id: "beijing-3",
          title: "八达岭长城",
          description: "世界七大奇迹之一，八达岭是其最受欢迎的部分之一。",
          latitude: 40.3599,
          longitude: 116.0204,
        },
        {
          id: "beijing-4",
          title: "颐和园",
          description: "一个巨大的皇家园林和湖泊，是中国园林设计的杰作。",
          latitude: 39.9988,
          longitude: 116.2748,
        },
        {
          id: "beijing-5",
          title: "天坛",
          description: "明清两代皇帝祭天的场所，是中国古代建筑的瑰宝。",
          latitude: 39.8822,
          longitude: 116.4066,
        },
      ],
      error: false,
    }
  }

  return defaultResponse
}
