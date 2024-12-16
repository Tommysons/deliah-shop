import db from "@/db/db"
import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { Resend } from "resend"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string)
const resend = new Resend(process.env.RESEND_API_KEY as string)

export async function POST(req: NextRequest) {
  try {
    // Log incoming request body and signature
    const rawBody = await req.text();
    console.log("Received raw body:", rawBody);
    const signature = req.headers.get("stripe-signature") as string;
    console.log("Received signature:", signature);

    // Construct the event from Stripe webhook
    const event = await stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
    console.log("Received event:", event);

    if (event.type === "charge.succeeded") {
      const charge = event.data.object;
      const productId = charge.metadata.productId;
      const email = charge.billing_details.email;
      const pricePaidInCents = charge.amount;

      // Log event data
      console.log("charge.succeeded event details:");
      console.log("productId:", productId);
      console.log("email:", email);
      console.log("pricePaidInCents:", pricePaidInCents);

      // Fetch product from DB
      const product = await db.product.findUnique({ where: { id: productId } });
      console.log("Fetched product:", product);

      if (product == null || email == null) {
        console.error("Invalid product or email", { product, email });
        return new NextResponse("Bad Request", { status: 400 });
      }

      // Create or update the user and their order
      const userFields = {
        email,
        orders: { create: { productId, pricePaidInCents } },
      };
      const {
        orders: [order],
      } = await db.user.upsert({
        where: { email },
        create: userFields,
        update: userFields,
        select: { orders: { orderBy: { createdAt: "desc" }, take: 1 } },
      });
      console.log("User upsert result:", order);

      // Create download verification
      const downloadVerification = await db.downloadVerification.create({
        data: {
          productId,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        },
      });
      console.log("Download verification created:", downloadVerification);

      // // Send email
      await resend.emails.send({
        from: `Support <${process.env.SENDER_EMAIL}>`,
        to: email,
        subject: "Order Confirmation",
        react: <h1>Hi</h1>,
      });
      // console.log("Email sent to:", email);

    }

    return new NextResponse("Webhook processed successfully", { status: 200 });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new NextResponse("Webhook Error", { status: 500 });
  }
}
