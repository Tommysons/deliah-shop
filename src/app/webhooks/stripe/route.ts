import db from "@/db/db";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// Initialize the Stripe instance
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export async function POST(req: NextRequest) {
  try {
    // Read the raw body from the request for Stripe to verify the signature
    const body = await req.text();
    const signature = req.headers.get("stripe-signature") as string;
    
    // Construct the event object from the raw request body and signature
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );

    // Handle the 'charge.succeeded' event type
    if (event.type === 'charge.succeeded') {
      const charge = event.data.object;
      const productId = charge.metadata.productId;
      const email = charge.billing_details.email;
      const pricePaidInCents = charge.amount;

      // Ensure the product and email are valid
      if (!productId || !email) {
        return new NextResponse("Bad Request: Missing productId or email", { status: 400 });
      }

      // Fetch the product from the database
      const product = await db.product.findUnique({ where: { id: productId } });
      if (product == null) {
        return new NextResponse("Bad Request: Product not found", { status: 400 });
      }

      // Create or update the user and their order
      const userFields = {
        email,
        orders: { create: { productId, pricePaidInCents } },
      };

      // Perform the upsert operation
      const {orders: [order]} =await db.user.upsert({
        where: { email }, // Assuming email is unique
        create: userFields,
        update: userFields,
        select: {orders: {orderBy: {createdAt: 'desc'}, take: 1}}
      });

      const downloadVerification = await db.downloadVerification.create({
        data: {productId, expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24)}
      })

      // Return a success response to Stripe
      return new NextResponse("Webhook processed successfully", { status: 200 });
    }

    // Handle other event types if needed
    return new NextResponse("Event type not handled", { status: 400 });

  } catch (error) {
    console.error("Error processing webhook:", error);
    return new NextResponse("Webhook Error", { status: 500 });
  }
}
