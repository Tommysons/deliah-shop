"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatCurrency } from "@/lib/formatters"
import { useActionState, useState } from "react"
import { addProduct, updateProduct } from "../../_actions/products"
import { useFormState, useFormStatus } from "react-dom"
import { Product } from "@prisma/client"
import Image from "next/image"


export function ProductForm({ product }: { product?: Product | null }) {

    const [error, action] = useActionState(product == null ? addProduct : updateProduct.bind(null, product.id), {})
    const [priceInCents, setPriceInCents] = useState<number | undefined>(product?.priceInCents ?? 0)

    return (
        <form action={action} className="space-y-8">
            {/* Name Input */}
            <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                    type="text"
                    id="name"
                    name="name"
                    required
                    defaultValue={product?.name || ''}
                />
                {error.name &&
                    <div className="text-destructive">{error.name}</div>}
            </div>

            {/* Price In Cents Input */}
            <div className="space-y-2">
                <Label htmlFor="priceInCents">Price In Cents</Label>
                <Input
                    type="text" // Keep as text to handle leading zeros
                    id="priceInCents"
                    name="priceInCents"
                    required
                    value={priceInCents}
                    onChange={e => {
                        const newValue = Number(e.target.value)
                        if (!isNaN(newValue) && newValue >= 0) {
                            setPriceInCents(newValue)
                        }
                    }}
                    inputMode="numeric" // Allow numeric input on mobile devices
                    pattern="^[0-9]*$" // Only numeric input allowed
                />
                {error.priceInCents &&
                    <div className="text-destructive">{error.priceInCents}</div>}

                {/* Display formatted currency */}
                <div className="text-muted-foreground">
                    {priceInCents ? formatCurrency(priceInCents / 100) : ''}
                </div>
            </div>

            {/* Description Textarea */}
            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                    id="description"
                    name="description"
                    required
                    defaultValue={product?.description || ""}
                />
                {error.description &&
                    <div className="text-destructive">{error.description}</div>}
            </div>

            {/* File Input */}
            <div className="space-y-2">
                <Label htmlFor="file">File</Label>
                <Input
                    type="file"
                    id="file"
                    name="file"
                    required={product == null} // Only required for new products
                />
                {product && product.filePath &&
                    <div className="text-muted-foreground">
                        {product.filePath}
                    </div>}
                {error.file &&
                    <div className="text-destructive">{error.file}</div>}
            </div>

            {/* Image Input */}
            <div className="space-y-2">
                <Label htmlFor="image">Image</Label>
                <Input type="file" id="image" name="image" required={product == null} />
                {product != null && (
                    <Image
                        src={`/${product.imagePath}`}  // Use products/ path
                        height={400}
                        width={400}
                        alt="Product Image"
                    />
                )}
                {error.image && <div className="text-destructive">{error.image}</div>}
            </div>

            <SubmitButton />
        </form>
    )
}

// Submit Button
function SubmitButton() {
    const { pending } = useFormStatus()
    return <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save"}
    </Button>
}
