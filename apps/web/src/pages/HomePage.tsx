import { Database, Plus, Upload } from "lucide-react"
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@dbland/ui"

export function HomePage(): JSX.Element {
    return (
        <div className="flex h-full items-center justify-center p-8">
            <div className="max-w-2xl space-y-8 text-center">
                {/* Welcome header */}
                <div className="space-y-2">
                    <Database className="mx-auto h-16 w-16 text-primary" />
                    <h1 className="text-3xl font-bold">Welcome to DBLand</h1>
                    <p className="text-muted-foreground">
                        The open-source NoSQL database GUI/WEB client for MongoDB and Redis
                    </p>
                </div>

                {/* Quick actions */}
                <div className="grid gap-4 sm:grid-cols-2">
                    <Card className="cursor-pointer transition-colors hover:bg-accent">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Plus className="h-5 w-5" />
                                New Connection
                            </CardTitle>
                            <CardDescription>Connect to MongoDB or Redis database</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button className="w-full">Create Connection</Button>
                        </CardContent>
                    </Card>

                    <Card className="cursor-pointer transition-colors hover:bg-accent">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Upload className="h-5 w-5" />
                                Import Connections
                            </CardTitle>
                            <CardDescription>Import from Studio 3T or other tools</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button variant="outline" className="w-full">
                                Import
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Recent connections placeholder */}
                <div className="space-y-2">
                    <h2 className="text-lg font-semibold">Recent Connections</h2>
                    <p className="text-sm text-muted-foreground">
                        No recent connections. Create a new connection to get started.
                    </p>
                </div>
            </div>
        </div>
    )
}
