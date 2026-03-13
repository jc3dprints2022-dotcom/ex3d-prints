import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronUp, HelpCircle, Mail } from "lucide-react";

export default function FAQ() {
  const [expandedSections, setExpandedSections] = useState({});

  const toggleSection = (id) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const faqSections = [
    {
      title: "Getting Help & Support",
      questions: [
        {
          id: "terms-location",
          question: "Where can I find the terms of service?",
          answer: "The terms of service can be found at the bottom left of the website, under the SUPPORT column."
        },
        {
          id: "contact-support",
          question: "How can I contact someone if I can't find the help I need here in the FAQs?",
          answer: "To reach us, scroll to the bottom left of the website and click on the CONTACT US button under the SUPPORT column to send us a form with any questions you might have."
        },
        {
          id: "report-abuse",
          question: "Where can I report abusive content?",
          answer: "Scroll to the bottom left of the website and click on the CONTACT US button under the SUPPORT column to send us any concerns you may have, and the appropriate actions will be taken shortly."
        }
      ]
    },
    {
      title: "Product Listings & Images",
      questions: [
        {
          id: "listing-images",
          question: "Who provides the images for product listings?",
          answer: "Currently, designers upload the images used for product listings. These may include photos of printed models or digital renderings. In the future, EX3D Prints may introduce a system where makers can print models and submit photos for listings, and receive additional compensation for doing so."
        },
        {
          id: "exact-match",
          question: "Will the printed product look exactly like the listing images?",
          answer: "Because prints are produced by independent makers, minor differences in surface finish, color tone, and texture may occur. Some listing images may also be digital renders, which can appear smoother than real printed objects. Listings include notes informing customers that slight variations are normal with 3D printed products."
        }
      ]
    },
    {
      title: "Print Quality & Maker Standards",
      questions: [
        {
          id: "quality-consistency",
          question: "How does EX3D Prints ensure consistent print quality?",
          answer: "Quality consistency is maintained through several safeguards: printing specifications provided with each order, a maker performance scoring system based on print quality, and a distribution system that prioritizes higher-rated makers for orders. This system helps ensure customers receive reliable quality across the network."
        },
        {
          id: "print-settings",
          question: "Are makers required to follow specific print settings?",
          answer: "Orders may include specific print instructions or profiles to guide makers in producing consistent results. These instructions help ensure prints match the designer's intended quality and specifications."
        }
      ]
    },
    {
      title: "Colors & Multicolor Prints",
      questions: [
        {
          id: "color-selections",
          question: "How do color selections work?",
          answer: "Listings may support several color options: single color selection, multicolor selections (primary and secondary colors), or \"shown colors\" option, where makers print the model exactly as shown in the images."
        },
        {
          id: "color-detail-loss",
          question: "What happens if a customer chooses a color that removes visible details?",
          answer: "If a customer selects a color that reduces visible details (for example, black eyes on a black model), the item will simply print as a single-color version. Customers can preview colors in the 3D viewer on the listing, though it currently shows solid colors only."
        },
        {
          id: "color-examples",
          question: "Will color examples be shown for all options?",
          answer: "Future updates may include visual examples of multiple color variations, including multicolor previews."
        },
        {
          id: "filament-brand",
          question: "Are makers required to use the same filament brand?",
          answer: "No. Makers are not currently required to use specific brands. However, each listing notes that exact colors may vary slightly. EX3D Prints offers discount filament ($15 per spool) to makers. This filament has consistent color standards, which helps improve product consistency across the network."
        }
      ]
    },
    {
      title: "Orders & Delivery",
      questions: [
        {
          id: "print-location",
          question: "Where are the prints produced?",
          answer: "The prints are produced in an area near you to ensure shorter shipping times."
        },
        {
          id: "delivery-time",
          question: "How long will it take for my print to arrive?",
          answer: "It will take 1-5 business days to be dropped off."
        },
        {
          id: "delivery-alerts",
          question: "How will I be alerted of changes in expected arrival date?",
          answer: "You will be sent an email with any delays."
        },
        {
          id: "damaged-prints",
          question: "My prints arrived damaged. How do I get a refund?",
          answer: (
            <>
              Reach out to <a href="mailto:ex3dprint@gmail.com" className="text-teal-600 hover:underline">ex3dprint@gmail.com</a>. Send photos of the print issue from several angles, and we will review it to determine the issue and whether or not you qualify for a refund.
            </>
          )
        }
      ]
    },
    {
      title: "Refunds & Order Issues",
      questions: [
        {
          id: "refund-handling",
          question: "How are refunds handled?",
          answer: "Refunds are currently handled case by case while the system is being refined. Possible outcomes include: the original maker reprinting the item, a different maker reprinting the item at no additional cost to the customer, or a full refund issued to the customer."
        },
        {
          id: "refund-responsibility",
          question: "Who pays for refunds caused by poor print quality?",
          answer: "If the issue is due to maker quality, the refund or reprint cost will typically be deducted from the maker's revenue, while the designer keeps their royalty."
        }
      ]
    },
    {
      title: "Pricing & Revenue",
      questions: [
        {
          id: "pricing-control",
          question: "Do designers set the price of their products?",
          answer: "Currently, prices are set automatically using an algorithm based on print time and filament usage. This keeps pricing consistent and fair across the marketplace. The pricing model may be revisited in the future depending on community feedback."
        },
        {
          id: "revenue-split",
          question: "How is revenue from each order split?",
          answer: "Current revenue distribution: Makers receive 50%, Designers receive 10% standard (25% for early adopters and established designers), and EX3D Prints receives 40%. The platform percentage is currently higher because the company is actively working to bring customers to the marketplace and build brand awareness. As the platform grows, the goal is to increase payouts to: Makers up to ~70%, and Designers ~15-20%."
        },
        {
          id: "maker-profitability",
          question: "Are makers profitable at the current split?",
          answer: "Yes. Even with the current payout structure, most makers maintain roughly 50% margins after material costs."
        }
      ]
    },
    {
      title: "Account Management",
      questions: [
        {
          id: "change-details",
          question: "How can I change my account details?",
          answer: "Go to the drop down on the top right and select settings, then edit."
        }
      ]
    },
    {
       title: "For Makers",
       questions: [
         {
           id: "payout-date",
           question: "When do I get paid?",
           answer: "You will get paid on the last day of each month."
         },
         {
           id: "download-design",
           question: "How do I download a design?",
           answer: "Go to your maker dashboard, set the order to printing and then download the files."
         },
         {
           id: "order-issues",
           question: "I'm having issues with this order. What can I do?",
           answer: "You can cancel the order on your side, another maker will pick up the work and finish it."
         },
         {
           id: "download-issues",
           question: "I'm having issues with my download. What can I do?",
           answer: (
             <>
               Reach out to <a href="mailto:ex3dprint@gmail.com" className="text-teal-600 hover:underline">ex3dprint@gmail.com</a> and we'll help you solve the issue.
             </>
           )
         }
       ]
     },
     {
       title: "For Designers",
       questions: [
         {
           id: "designer-signup",
           question: "How do I sign up as a designer?",
           answer: "Signing up is completely free! Just create an account, verify your email, and you can start uploading designs immediately."
         },
         {
           id: "designer-products",
           question: "What types of products can I sell?",
           answer: "You can sell physical 3D printed versions of your designs. Digital files are not sold directly."
         },
         {
           id: "file-formats-designer",
           question: "Do I need special software or file formats?",
           answer: "We accept standard 3D printing files like .stl, .obj, and .3mf. There are no file size limits."
         },
         {
           id: "upload-cost",
           question: "How much does it cost to upload my designs?",
           answer: "Uploading is free. You only pay if you choose to boost a listing for extra visibility ($5 per week, up to 4 weeks)."
         },
         {
           id: "boosting",
           question: "What is \"boosting\" a listing?",
           answer: "Boosting promotes your design to the top of the marketplace and search results. Boosted listings get significantly more visibility and views."
         },
         {
           id: "designer-payment",
           question: "How are designers paid?",
           answer: "You earn 10% of each sale. Payments are processed automatically after each order is completed."
         },
         {
           id: "design-rights",
           question: "Do I need to own the rights to my designs?",
           answer: "Yes. You are fully responsible for copyright compliance. Only upload designs you own or have permission to sell."
         },
         {
           id: "copyright-dispute",
           question: "What happens if there is a copyright dispute?",
           answer: "If a copyright issue arises, you are liable for any claims. We may remove disputed listings, but legal responsibility rests with the designer."
         },
         {
           id: "refund-request",
           question: "What if a customer requests a refund?",
           answer: "We offer refunds for eligible orders. Refunds are handled through our platform and are deducted from your sale amount before you receive your payout."
         },
         {
           id: "maximize-sales",
           question: "How do I maximize sales?",
           answer: "Test print your designs to ensure quality, use high-quality photos from multiple angles, provide detailed descriptions and assembly instructions if needed, and boost your top designs for extra visibility."
         }
       ]
     },
    {
      title: "General 3D Print Questions",
      questions: [
        {
          id: "how-made",
          question: "How are the products made?",
          answer: "All products are created using local 3D printing technology. Your digital design is printed layer by layer to produce a precise, high-quality physical model. Each item is custom-made based on your submitted design specifications."
        },
        {
          id: "services-offered",
          question: "What kind of services do you offer?",
          answer: "Ex3DPrints offers custom 3D printing for personal, professional, and creative projects. You can upload your design, choose materials, and have your part printed and shipped. The service also supports designers who want to share or sell their 3D models online."
        },
        {
          id: "materials",
          question: "What materials do you offer?",
          answer: "We offer a range of durable and versatile 3D printing materials suited for prototypes, models, and artistic prints. Common materials include PLA, ABS, resin, and other plastics, depending on your location and makers nearby."
        },
        {
          id: "3d-scanning",
          question: "Do you do 3D scanning?",
          answer: "At this time, Ex3DPrints does not list 3D scanning as one of its services. If you already have a physical object, you'll need to create a digital model of it using your own 3D scanner or modeling software before uploading it."
        },
        {
          id: "upload-design",
          question: "How can I upload a 3D Print design?",
          answer: "Currently the only way is to order a custom order."
        },
        {
          id: "file-formats",
          question: "What type of file format is needed?",
          answer: "We accept standard 3D printing file formats such as .STL, .OBJ, and .STEP. These formats ensure your design can be accurately processed for printing."
        },
        {
          id: "pre-split-files",
          question: "Do the files come pre-split?",
          answer: "Designs are typically printed as a single file unless you've pre-split them into sections. If your model is too large for a single print, please upload pre-split files or contact us for guidance on preparing your model for printing."
        },
        {
          id: "design-licensing",
          question: "Design licensing? How are designs protected?",
          answer: (
            <>
              Designs remain the property of their original creators. Ex3DPrints takes file security seriously and does not share or distribute your designs without your permission. For full details, please review our <Link to={createPageUrl("Terms")} className="text-teal-600 hover:underline">Terms of Service</Link> and Design Policy for how licensing and protection are handled.
            </>
          )
        },
        {
          id: "add-tags",
          question: "How can I add tags and descriptions to my design?",
          answer: "When uploading a design, you'll be prompted to enter a title, description, and relevant tags. This helps customers or collaborators find your work more easily and understand what your design offers."
        },
        {
          id: "remove-design",
          question: "How do I take my design off the website?",
          answer: "You can remove your design at any time by logging into your account and deleting it from your uploads or listings. If you encounter any issues, contact our support team and they can remove it for you."
        }
      ]
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-100 rounded-2xl mb-6">
            <HelpCircle className="w-8 h-8 text-teal-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-xl text-gray-600">
            Find answers to common questions about EX3D Prints
          </p>
        </div>

        {/* FAQ Sections */}
        <div className="space-y-8">
          {faqSections.map((section, sectionIdx) => (
            <div key={sectionIdx}>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {section.title}
              </h2>
              <div className="space-y-3">
                {section.questions.map((item) => (
                  <Card key={item.id} className="border-2 hover:border-teal-200 transition-colors">
                    <button
                      onClick={() => toggleSection(item.id)}
                      className="w-full text-left p-6 flex items-start justify-between gap-4"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-lg">
                          {item.question}
                        </h3>
                        {expandedSections[item.id] && (
                          <div className="mt-4 text-gray-700 leading-relaxed">
                            {item.answer}
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        {expandedSections[item.id] ? (
                          <ChevronUp className="w-5 h-5 text-teal-600" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </button>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Still Need Help? */}
        <div className="mt-16 bg-gradient-to-r from-teal-500 to-blue-600 rounded-2xl p-8 text-white text-center">
          <Mail className="w-12 h-12 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Still need help?</h2>
          <p className="text-teal-50 mb-6">
            Can't find what you're looking for? We're here to help!
          </p>
          <Link to={createPageUrl("Contact")}>
            <button className="bg-white text-teal-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
              Contact Support
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}