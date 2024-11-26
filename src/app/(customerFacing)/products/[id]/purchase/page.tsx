import db from "@/db/db"
import { notFound } from "next/navigation"

export default async function PurchasePage({params} : {params: {id: string}}){
    const {id} = await params
    const product = await db.product.findUnique({
        where: {id}
    })
    if(product == null) return notFound()
    return <h1>Hi</h1>
}