import { PageHeader } from "@/app/admin/_componets/pageHeader"
import { ProductForm } from "../../_components/ProductForm"
import db from "@/db/db"

export default async function EditProductPage({
    params,
}: {
    params: { id: string }
}) {
    const { id } = await params; // Awaiting params before using its properties
    
    const product = await db.product.findUnique({ where: { id } })
  
    return (
      <>
        <PageHeader>Edit Product</PageHeader>
        <ProductForm product={product} />
      </>
    )
}