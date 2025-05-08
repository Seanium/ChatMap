"use client"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bookmark, Clock } from "lucide-react"

interface SavedQuery {
  id: string
  query: string
  timestamp: Date
  saved: boolean
}

interface SavedQueriesProps {
  queries: SavedQuery[]
  onSelectQuery: (query: string) => void
  onToggleSave: (id: string) => void
}

export default function SavedQueries({ queries, onSelectQuery, onToggleSave }: SavedQueriesProps) {
  return (
    <div className="border rounded-md">
      <div className="p-3 border-b font-medium flex items-center gap-2">
        <Clock className="h-4 w-4" />
        <span>Recent Searches</span>
      </div>
      <ScrollArea className="h-[300px]">
        <div className="p-2">
          {queries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No recent searches</p>
          ) : (
            <ul className="space-y-1">
              {queries.map((item) => (
                <li key={item.id} className="flex items-center justify-between p-2 hover:bg-muted rounded-md">
                  <Button
                    variant="ghost"
                    className="text-left justify-start h-auto p-0 font-normal w-full"
                    onClick={() => onSelectQuery(item.query)}
                  >
                    <span className="truncate">{item.query}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={() => onToggleSave(item.id)}
                  >
                    <Bookmark className={`h-4 w-4 ${item.saved ? "fill-current text-primary" : ""}`} />
                    <span className="sr-only">{item.saved ? "Unsave" : "Save"}</span>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
