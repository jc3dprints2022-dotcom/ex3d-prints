import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

// ── PRODUCT IDs ───────────────────────────────────────────────────────────────
const SATURN_V_ID = "693b06e655e441e07049d328";
const SLS_ID      = "69dbf08433850e148542d876";

// ── PRICING ───────────────────────────────────────────────────────────────────
const SATURN_V_PRICE  = 39;
const SLS_PRICE       = 30;
const BUNDLE_PRICE    = 60;
const BUNDLE_SLS_PRICE  = BUNDLE_PRICE - SATURN_V_PRICE;
const SEPARATE_TOTAL  = SATURN_V_PRICE + SLS_PRICE; // $69
const BUNDLE_SAVINGS  = SEPARATE_TOTAL - BUNDLE_PRICE; // $9

const EMAIL_DISCOUNT_CODE = "WELCOME10";

// ── IMAGES — filled in from heavy-lift page ───────────────────────────────────
const SATURN_V_HERO = "https://media.base44.com/images/public/68f40a023bb378f79ed78369/fb3c7d07a_671660729_1599137397983813_1991239647601769069_n.jpg";
const SLS_HERO      = "https://media.base44.com/images/public/68f40a023bb378f79ed78369/eeee32efc_1.jpg";

const SATURN_V_IMAGE = SATURN_V_HERO || "https://base44.app/api/apps/68f40a023bb378f79ed78369/files/public/68f40a023bb378f79ed78369/712440286_MULTIPART.png";
const SLS_IMAGE      = SLS_HERO      || "https://base44.app/api/apps/68f40a023bb378f79ed78369/files/mp/public/68f40a023bb378f79ed78369/da37e7640_SLS1-12025.png";

const FOUNDER_IMAGE = "https://media.base44.com/images/public/68f40a023bb378f79ed78369/428ab4b45_Founder.jpg";

const SHIPPING_DAYS = "2-4 days";
const MAKER_STATES  = 11;
const MAKER_COUNT   = 19;

export default function SaturnV() {
  const [adding, setAdding]                 = useState(null);
  const [openFaq, setOpenFaq]               = useState(null);
  const [lightboxImage, setLightboxImage]   = useState(null);
  const [email, setEmail]                   = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [emailLoading, setEmailLoading]     = useState(false);
  const [codeCopied, setCodeCopied]         = useState(false);
  const { toast } = useToast();

  const addToCart = async (type) => {
    setAdding(type);
    try {
      const user = await base44.auth.me().catch(() => null);

      if (type === "saturn" || type === "bundle") {
        const existing = await base44.entities.Cart.filter({ user_id: user?.id, product_id: SATURN_V_ID });
        if (existing.length > 0) {
          await base44.entities.Cart.update(existing[0].id, {
            unit_price: SATURN_V_PRICE,
            total_price: SATURN_V_PRICE * existing[0].quantity,
          });
        } else {
          const cart = user
            ? null
            : JSON.parse(localStorage.getItem("anonymousCart") || "[]");

          if (user) {
            await base44.entities.Cart.create({
              user_id: user.id, product_id: SATURN_V_ID, product_name: "Saturn V",
              quantity: 1, selected_material: "PLA", selected_color: "Shown Colors",
              unit_price: SATURN_V_PRICE, total_price: SATURN_V_PRICE,
              images: [SATURN_V_IMAGE],
            });
          } else {
            cart.push({ id: `anon_${SATURN_V_ID}_${Date.now()}`, product_id: SATURN_V_ID, product_name: "Saturn V", quantity: 1, selected_material: "PLA", selected_color: "Shown Colors", unit_price: SATURN_V_PRICE, total_price: SATURN_V_PRICE, images: [SATURN_V_IMAGE] });
            localStorage.setItem("anonymousCart", JSON.stringify(cart));
          }
        }
      }

      if (type === "sls" || type === "bundle") {
        const slsPrice = type === "bundle" ? BUNDLE_SLS_PRICE : SLS_PRICE;
        const slsName  = type === "bundle" ? "SLS (Artemis) Bundle" : "SLS (Artemis)";
        const existing = await base44.entities.Cart.filter({ user_id: user?.id, product_id: SLS_ID });
        if (existing.length > 0) {
          await base44.entities.Cart.update(existing[0].id, {
            unit_price: slsPrice, total_price: slsPrice * existing[0].quantity, product_name: slsName,
          });
        } else {
          if (user) {
            await base44.entities.Cart.create({
              user_id: user.id, product_id: SLS_ID, product_name: slsName,
              quantity: 1, selected_material: "PLA", selected_color: "Shown Colors",
              unit_price: slsPrice, total_price: slsPrice, images: [SLS_IMAGE],
            });
          } else {
            const cart = JSON.parse(localStorage.getItem("anonymousCart") || "[]");
            cart.push({ id: `anon_${SLS_ID}_${Date.now()}`, product_id: SLS_ID, product_name: slsName, quantity: 1, selected_material: "PLA", selected_color: "Shown Colors", unit_price: slsPrice, total_price: slsPrice, images: [SLS_IMAGE] });
            localStorage.setItem("anonymousCart", JSON.stringify(cart));
          }
        }
      }