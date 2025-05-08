"use client"

import { Button } from "@/components/ui/button"

const SUGGESTED_QUERIES = [
  {
    title: "法国普罗旺斯薰衣草花田最佳观赏路线",
    category: "nature",
  },
  {
    title: "北京胡同深度一日游路线",
    category: "culture",
  },
  {
    title: "撒哈拉沙漠最著名的绿洲城市",
    category: "travel",
  },
  {
    title: "西西里岛最地道的传统美食餐厅",
    category: "food",
  },
  {
    title: "东京奥运会场馆位置和交通指南",
    category: "sports",
  },
  {
    title: "新西兰南岛自驾十日游路线规划",
    category: "travel",
  },
  {
    title: "里约热内卢狂欢节最佳观赏地点",
    category: "culture",
  },
  {
    title: "印度金三角旅游路线及景点推荐",
    category: "history",
  },
  {
    title: "北欧四国夏季极光观测点",
    category: "nature",
  },
  {
    title: "马达加斯加特有物种分布地图",
    category: "science",
  },
  {
    title: "伊斯坦布尔跨欧亚两洲一日游",
    category: "travel",
  },
  {
    title: "澳大利亚大堡礁最佳潜水地点",
    category: "adventure",
  },
]

interface SuggestedQueriesProps {
  onSelectQuery: (query: string) => void
}

export default function SuggestedQueries({ onSelectQuery }: SuggestedQueriesProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
      {SUGGESTED_QUERIES.map((query, index) => (
        <Button
          key={index}
          variant="outline"
          className="h-auto min-h-[60px] py-3 px-4 justify-start text-left"
          onClick={() => onSelectQuery(query.title)}
        >
          <span className="text-sm whitespace-normal">{query.title}</span>
        </Button>
      ))}
    </div>
  )
}
