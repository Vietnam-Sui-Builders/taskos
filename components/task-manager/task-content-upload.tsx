"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Label } from "../ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";
import { Loader2 } from "lucide-react";

const walrusServices = [
    {
        id: "service1",
        name: "walrus.space",
        publisherUrl: "https://publisher.walrus-testnet.walrus.space",
        aggregatorUrl: "https://aggregator.walrus-testnet.walrus.space",
    },
    {
        id: "service2",
        name: "staketab.org",
        publisherUrl: "https://walrus-testnet-publisher.staketab.org",
        aggregatorUrl: "https://wal-aggregator-testnet.staketab.org",
    },
    {
        id: "service3",
        name: "nodes.guru",
        publisherUrl: "https://walrus-testnet-publisher.nodes.guru",
        aggregatorUrl: "https://walrus-testnet-aggregator.nodes.guru",
    },
    {
        id: "service4",
        name: "blockscope.net",
        publisherUrl: "https://walrus-testnet-publisher.blockscope.net",
        aggregatorUrl: "https://walrus-testnet.blockscope.net",
    },
    {
        id: "service5",
        name: "overclock.run",
        publisherUrl: "https://walrus-testnet-publisher.overclock.run",
        aggregatorUrl: "https://sui-walrus-testnet.overclock.run",
    },
];

export const TaskContentUpload = () => {
    const [content, setContent] = useState("");
    const [files, setFiles] = useState<FileList | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedService, setSelectedService] = useState("service1");

    return (
        <Card className="p-6">
            <CardContent className="space-y-6 p-0">
                <h2 className="text-xl font-bold">Add Content and Files</h2>

                {/* --- Walrus Service --- */}
                <div className="space-y-2">
                    <Label className="text-base font-medium">
                        Walrus Service
                    </Label>
                    <Select
                        onValueChange={(value) => setSelectedService(value)}
                        value={selectedService}
                        disabled={isUploading}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select a service" />
                        </SelectTrigger>
                        <SelectContent>
                            {walrusServices.map((service) => (
                                <SelectItem key={service.id} value={service.id}>
                                    {service.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* --- Content --- */}
                <div className="space-y-2">
                    <Label className="text-base font-medium">Content</Label>
                    <Textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Enter task content... This will be encrypted and stored on Walrus"
                        rows={6}
                        disabled={isUploading}
                    />
                </div>

                {/* --- Files --- */}
                <div className="space-y-2">
                    <Label className="text-base font-medium">Files</Label>
                    <input
                        type="file"
                        multiple
                        onChange={(e) => setFiles(e.target.files)}
                        disabled={isUploading}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm file:font-medium hover:file:bg-muted/80"
                    />
                    <p className="text-sm text-muted-foreground">
                        Select multiple files to attach. Files will be encrypted
                        and stored on Walrus.
                    </p>
                </div>

                {/* --- Uploading indicator --- */}
                {isUploading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Encrypting and uploading to Walrus...</span>
                    </div>
                )}

                {/* --- Upload button --- */}
                <Button
                    // onClick={handleUpload}
                    disabled={
                        isUploading ||
                        (!content.trim() && (!files || files.length === 0))
                    }
                    size="lg"
                    className="w-full"
                >
                    {isUploading
                        ? "Uploading..."
                        : "Encrypt & Upload to Walrus"}
                </Button>
            </CardContent>
        </Card>
    );
};
