import { Link } from "react-router-dom"

import { Page } from "@/components/page"
import { Button } from "@/components/ui/button"

export function NotFoundPage() {
  return (
    <Page className="flex flex-col items-center py-24 text-center">
      <p className="font-heading text-3xl">Nothing here</p>
      <p className="mt-2 max-w-sm text-muted-foreground">
        This page may have been renamed or deleted
      </p>
      <Button className="mt-6" variant="outline" nativeButton={false} render={<Link to="/" />}>
        Back to domains
      </Button>
    </Page>
  )
}
