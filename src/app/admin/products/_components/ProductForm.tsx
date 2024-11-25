"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatCurrency } from "@/lib/formatters"
import { useState } from "react"
import { addProduct } from "../../_actions/products"
import { useFormStatus } from "react-dom"


export function ProductForm() {

    const [priceInCents, setPriceInCents] = useState<number | string>(0)
    const [error, setError] = useState<string | null>(null)

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        // Allow only digits or empty value for the input
        if (/^\d*$/.test(value)) {
            setPriceInCents(value === '' ? '' : Number(value));
        }
    }

    return (
        <form action={addProduct} className="space-y-8">
            <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input type="text" id="name" name="name" required />
            </div>
            <div className="space-y-2">
                <Label htmlFor="priceInCents">Price In Cents</Label>
                <Input
                    type="text" // Changed to text to avoid leading zeros in number input
                    id="priceInCents"
                    name="priceInCents"
                    required
                    value={priceInCents}
                    onChange={handlePriceChange}
                    inputMode="numeric" // Allow numeric input on mobile devices
                    pattern="\d*" // Ensure that only numeric characters are allowed
                />
                {/* Only show formatted currency if there's a valid price */}
                <div className="text-muted-foreground">{priceInCents ? formatCurrency(Number(priceInCents) / 100) : ''}</div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" required />
            </div>
            <div className="space-y-2">
                <Label htmlFor="file">File</Label>
                <Input type="file" id="file" name="file" required />
            </div>
            <div className="space-y-2">
                <Label htmlFor="image">Image</Label>
                <Input type="file" id="image" name="image" required />
            </div>
            <SubmitButton/>
        </form>
    )
}


function SubmitButton() {
    const { pending } = useFormStatus()
    return <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save"}
    </Button>
}