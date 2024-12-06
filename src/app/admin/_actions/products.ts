"use server"

import db from "@/db/db"
import { z } from "zod"
import fs from 'fs/promises'
import { notFound, redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

// Schemas for validating the form input
const fileSchema = z.instanceof(File, { message: "Required" })
const imageSchema = fileSchema.refine(
  file => file.size === 0 || file.type.startsWith("image/"),
  "File must be an image"
)

// Schema to validate the product data
const addSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  priceInCents: z.coerce.number().int().min(1),
  file: fileSchema.refine(file => file.size > 0, "File is required"),
  image: imageSchema.refine(file => file.size > 0, "Image is required"),
})


// Function to handle product creation
export async function addProduct(prevState: unknown, formData: FormData) {
  const result = addSchema.safeParse(Object.fromEntries(formData.entries()))

  // If validation fails, return errors
  if (result.success === false) {
    return result.error.formErrors.fieldErrors
  }

  const data = result.data

  // Ensure the 'public/products/' folder exists
  await fs.mkdir("public/products", { recursive: true })

  // Save the product file (e.g., PDF, .zip) to 'public/products/' folder
  const filePath = `public/products/${crypto.randomUUID()}-${data.file.name}`
  await fs.writeFile(filePath, Buffer.from(await data.file.arrayBuffer()))

  // Save the image to 'public/products/' folder
  const imagePath = `products/${crypto.randomUUID()}-${data.image.name}` // Save image in public/products
  await fs.writeFile(
    `public/${imagePath}`, 
    Buffer.from(await data.image.arrayBuffer())
  )

  // Create the product record in the database
  await db.product.create({
    data: {
      isAvailableForPurchase: false,
      name: data.name,
      description: data.description,
      priceInCents: data.priceInCents,
      filePath: filePath,
      imagePath: imagePath,
    }
  })

  // Redirect to the products page
  revalidatePath("/")
  revalidatePath("/products")
  redirect('/admin/products')
}

const editSchema = addSchema.extend({
  file: fileSchema.optional(),
  image: imageSchema.optional()
})

// Function to update an existing product
export async function updateProduct(id: string, prevState: unknown, formData: FormData) {
  const result = editSchema.safeParse(Object.fromEntries(formData.entries()))

  // If validation fails, return errors
  if (result.success === false) {
    return result.error.formErrors.fieldErrors
  }

  const data = result.data
  const product = await db.product.findUnique({ where: { id } })

  if (product === null) return notFound()

  let filePath = product.filePath
  if (data.file != null && data.file.size > 0) {
    // Delete the old file before saving the new one
    await fs.unlink(`public/${product.filePath}`)
    filePath = `products/${crypto.randomUUID()}-${data.file.name}`
    await fs.writeFile(`public/${filePath}`, Buffer.from(await data.file.arrayBuffer()))
  }

  let imagePath = product.imagePath
  if (data.image != null && data.image.size > 0) {
    // Delete the old image before saving the new one
    await fs.unlink(`public/${product.imagePath}`)
    imagePath = `products/${crypto.randomUUID()}-${data.image.name}` // Use the same variable (no redeclaration)
    await fs.writeFile(`public/${imagePath}`, Buffer.from(await data.image.arrayBuffer()))
  }

  // Update the product record in the database
  await db.product.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
      filePath: filePath,
      imagePath: imagePath,
    }
  })

  // Redirect to the products page
  revalidatePath('/')
  revalidatePath("/products")
  redirect('/admin/products')
}

// Function to toggle product availability (for admins)
export async function toggleProductAvailability(id: string, isAvailableForPurchase: boolean) {
  await db.product.update({
    where: { id },
    data: { isAvailableForPurchase }
  })

  revalidatePath('/')
  revalidatePath("/products")
}

// Function to delete a product
export async function deleteProduct(id: string) {
  const product = await db.product.delete({ where: { id } })

  if (product == null) return notFound()

  // Correct the file and image paths
  const filePath = product.filePath // Assuming filePath is relative to the 'public/' folder
  const imagePath = `public/${product.imagePath}` // Ensure the full path for the image is provided

  // Delete the product files from the filesystem
  try {
    await fs.unlink(filePath) // Deleting the file
    await fs.unlink(imagePath) // Deleting the image
  } catch (error) {
    console.error('Error deleting product files:', error)
  }

  revalidatePath('/')
  revalidatePath("/products")
}
