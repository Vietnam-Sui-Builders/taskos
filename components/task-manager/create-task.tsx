"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { IconCirclePlusFilled } from "@tabler/icons-react";
import {
    useCurrentAccount,
    useSignAndExecuteTransaction,
    useSuiClient,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { handleTransactionError } from "@/lib/errorHandling";

export const CreateTask = () => {

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [priority, setPriority] = useState("2"); // Default to Medium priority
    const [category, setCategory] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState("");
    const [visibility, setVisibility] = useState("0"); // 0 = private, 1 = team, 2 = public
    const [isCreating, setIsCreating] = useState(false);
    const [open, setOpen] = useState(false);

    const queryClient = useQueryClient();
    const suiClient = useSuiClient();
    const account = useCurrentAccount();
    const { mutateAsync: signAndExecuteTransaction } =
        useSignAndExecuteTransaction();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!account) return;

        // Validate environment variables
        const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID;
        const versionObjectId = process.env.NEXT_PUBLIC_VERSION_ID;
        const taskRegistryId = process.env.NEXT_PUBLIC_TASKS_REGISTRY_ID;

        if (!packageId) {
            console.error("Missing NEXT_PUBLIC_PACKAGE_ID environment variable");
            toast.error("Configuration error: Package ID not set. Please check your .env.local file.");
            return;
        }

        if (!versionObjectId) {
            console.error("Missing NEXT_PUBLIC_VERSION_ID environment variable");
            toast.error("Configuration error: Version ID not set. Please check your .env.local file.");
            return;
        }

        if (!taskRegistryId) {
            console.error("Missing NEXT_PUBLIC_TASKS_REGISTRY_ID environment variable");
            toast.error("Configuration error: Task Registry ID not set. Please check your .env.local file.");
            return;
        }

        setIsCreating(true);
        try {
            const tx = new Transaction();
            
            // Prepare due_date as Option<u64> - timestamp in milliseconds
            const dueDateTimestamp = dueDate 
                ? Math.floor(new Date(dueDate).getTime()) 
                : null;

            // Task is now a shared object, no need to capture return value or transfer
            tx.moveCall({
                target: `${packageId}::task_manage::create_task`,
                arguments: [
                    tx.object(versionObjectId), // version: &Version
                    tx.pure.string(title), // title: String
                    tx.pure.string(description), // description: String
                    tx.pure.string(imageUrl), // image_url: String
                    dueDateTimestamp 
                        ? tx.pure.option("u64", dueDateTimestamp)
                        : tx.pure.option("u64", null), // due_date: Option<u64>
                    tx.pure.u8(Number(priority)), // priority: u8
                    tx.pure.u8(Number(visibility)), // visibility: u8
                    tx.pure.string(category), // category: String
                    tx.pure.vector("string", tags), // tags: vector<String>
                    tx.pure.option("string", null), // content_blob_id: Option<String>
                    tx.pure.vector("string", []), // initial_file_blob_ids: vector<String>
                    tx.object("0x6"), // clock: &Clock (0x6 is the shared Clock object)
                    tx.object(taskRegistryId), // registry: &mut TaskRegistry
                ],
            });

            const resp = await signAndExecuteTransaction({
                transaction: tx,
            });
            
            await suiClient.waitForTransaction({ digest: resp.digest });
            await queryClient.invalidateQueries({
                queryKey: ["testnet", "getOwnedObjects"],
            });
            await queryClient.invalidateQueries({
                queryKey: ["testnet", "getObject"],
            });

            // Show success message
            toast.success("Task created successfully!", {
                description: `"${title}" has been added to your task board.`,
            });

            // Reset form
            setTitle("");
            setDescription("");
            setImageUrl("");
            setDueDate("");
            setPriority("2");
            setVisibility("0");
            setCategory("");
            setTags([]);
            setOpen(false);
        } catch (error) {
            handleTransactionError(error, "Failed to create task");
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="lg" className="w-full h-full gap-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/50 transition-all duration-300 group">
                    <IconCirclePlusFilled className="group-hover:animate-pulse" />
                    <span className="font-display tracking-wide">QUICK_CREATE</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] glass border-primary/20 bg-background/80 backdrop-blur-xl shadow-2xl shadow-primary/10">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-display tracking-wide text-primary">
                        CREATE_TASK_PROTOCOL
                    </DialogTitle>
                    <DialogDescription className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                        Initialize new task sequence. Fill in required parameters.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label htmlFor="title" className="font-mono text-xs uppercase tracking-wider text-primary/80">Task Title</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="ENTER_TITLE..."
                            required
                            className="bg-background/50 border-primary/20 focus:border-primary/50 font-mono"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description" className="font-mono text-xs uppercase tracking-wider text-primary/80">Description</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="ENTER_DESCRIPTION..."
                            rows={3}
                            className="bg-background/50 border-primary/20 focus:border-primary/50 resize-none font-mono"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="image-url" className="font-mono text-xs uppercase tracking-wider text-primary/80">Image URL (Optional)</Label>
                        <Input
                            id="image-url"
                            value={imageUrl ? imageUrl : "https://cdn.prod.website-files.com/6864f039b26f4afedada6bc5/6864f039b26f4afedada6bf4_footer-img.svg"}
                            onChange={(e) => setImageUrl(e.target.value)}
                            placeholder="https://..."
                            className="bg-background/50 border-primary/20 focus:border-primary/50 font-mono text-xs"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="category" className="font-mono text-xs uppercase tracking-wider text-primary/80">Category</Label>
                        <Input
                            id="category"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            placeholder="e.g., DEV, DESIGN, OPS"
                            className="bg-background/50 border-primary/20 focus:border-primary/50 font-mono"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="visibility" className="font-mono text-xs uppercase tracking-wider text-primary/80">Visibility</Label>
                        <Select
                            value={visibility}
                            onValueChange={(value: string) => setVisibility(value)}
                        >
                            <SelectTrigger
                                id="visibility"
                                className="bg-background/50 border-primary/20 focus:border-primary/50 font-mono"
                            >
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-background/90 border-primary/20 backdrop-blur-xl">
                                <SelectItem value="0">PRIVATE</SelectItem>
                                <SelectItem value="1">TEAM</SelectItem>
                                <SelectItem value="2">PUBLIC</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="tags" className="font-mono text-xs uppercase tracking-wider text-primary/80">Tags</Label>
                        <div className="flex gap-2">
                            <Input
                                id="tags"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && tagInput.trim()) {
                                        e.preventDefault();
                                        if (tags.length < 10) {
                                            setTags([...tags, tagInput.trim()]);
                                            setTagInput("");
                                        }
                                    }
                                }}
                                placeholder="ADD_TAG (PRESS ENTER)"
                                className="bg-background/50 border-primary/20 focus:border-primary/50 font-mono"
                            />
                        </div>
                        {tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {tags.map((tag, index) => (
                                    <span
                                        key={index}
                                        className="px-2 py-1 text-xs bg-primary/10 border border-primary/20 text-primary rounded-md flex items-center gap-1 font-mono"
                                    >
                                        {tag}
                                        <button
                                            type="button"
                                            onClick={() => setTags(tags.filter((_, i) => i !== index))}
                                            className="hover:text-destructive transition-colors"
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between gap-4">
                        <div className="space-y-2 flex-1">
                            <Label htmlFor="due-date" className="font-mono text-xs uppercase tracking-wider text-primary/80">
                                Due Date
                            </Label>
                            <Input
                                id="due-date"
                                type="datetime-local"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                disabled={isCreating}
                                className="bg-background/50 border-primary/20 focus:border-primary/50 font-mono text-xs"
                            />
                        </div>

                        <div className="space-y-2 flex-1">
                            <Label htmlFor="priority" className="font-mono text-xs uppercase tracking-wider text-primary/80">Priority</Label>
                            <Select
                                value={priority.toString()}
                                onValueChange={(value: string) =>
                                    setPriority(value)
                                }
                            >
                                <SelectTrigger
                                    id="priority"
                                    className="bg-background/50 border-primary/20 focus:border-primary/50 font-mono"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-background/90 border-primary/20 backdrop-blur-xl">
                                    <SelectItem value="1">LOW</SelectItem>
                                    <SelectItem value="2">MEDIUM</SelectItem>
                                    <SelectItem value="3">HIGH</SelectItem>
                                    <SelectItem value="4">CRITICAL</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            className="flex-1 border-destructive/20 text-destructive hover:bg-destructive/10 hover:border-destructive/50 font-mono uppercase tracking-wider"
                        >
                            Abort
                        </Button>
                        <Button
                            type="submit"
                            disabled={
                                !title.trim() ||
                                !description.trim() ||
                                !category.trim() ||
                                isCreating
                            }
                            variant="default"
                            className="flex-1 bg-primary/20 text-primary border border-primary/50 hover:bg-primary/30 hover:border-primary font-mono uppercase tracking-wider"
                        >
                            {isCreating ? "EXECUTING..." : "INITIATE_TASK"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};
