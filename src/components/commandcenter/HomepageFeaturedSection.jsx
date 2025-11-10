import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Trash2, Plus, Loader2, MoveUp, MoveDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function HomepageFeaturedSection() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [featured, products] = await Promise.all([
        base44.entities.HomepageFeatured.list(),
        base44.entities.Product.filter({ status: 'active' })
      ]);

      // Sort by display order
      const sortedFeatured = featured.sort((a, b) => a.display_order - b.display_order);
      setFeaturedProducts(sortedFeatured);
      setAllProducts(products);
    } catch (error) {
      console.error("Failed to load data:", error);
      toast({
        title: "Failed to load featured products",
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!selectedProductId) {
      toast({
        title: "Please select a product",
        variant: "destructive"
      });
      return;
    }

    if (featuredProducts.length >= 10) {
      toast({
        title: "Maximum reached",
        description: "You can only feature up to 10 products on the homepage",
        variant: "destructive"
      });
      return;
    }

    try {
      const nextOrder = featuredProducts.length + 1;
      await base44.entities.HomepageFeatured.create({
        product_id: selectedProductId,
        display_order: nextOrder,
        is_active: true
      });

      toast({ title: "Product added to homepage!" });
      setShowAddDialog(false);
      setSelectedProductId("");
      loadData();
    } catch (error) {
      toast({
        title: "Failed to add product",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleRemove = async (featuredId) => {
    if (!confirm("Remove this product from the homepage?")) return;

    try {
      await base44.entities.HomepageFeatured.delete(featuredId);
      toast({ title: "Product removed from homepage" });
      loadData();
    } catch (error) {
      toast({
        title: "Failed to remove product",
        variant: "destructive"
      });
    }
  };

  const handleMoveUp = async (featured) => {
    if (featured.display_order === 1) return;

    try {
      const prevFeatured = featuredProducts.find(f => f.display_order === featured.display_order - 1);
      
      await base44.entities.HomepageFeatured.update(featured.id, {
        display_order: featured.display_order - 1
      });
      
      if (prevFeatured) {
        await base44.entities.HomepageFeatured.update(prevFeatured.id, {
          display_order: prevFeatured.display_order + 1
        });
      }

      loadData();
    } catch (error) {
      toast({
        title: "Failed to reorder",
        variant: "destructive"
      });
    }
  };

  const handleMoveDown = async (featured) => {
    if (featured.display_order === featuredProducts.length) return;

    try {
      const nextFeatured = featuredProducts.find(f => f.display_order === featured.display_order + 1);
      
      await base44.entities.HomepageFeatured.update(featured.id, {
        display_order: featured.display_order + 1
      });
      
      if (nextFeatured) {
        await base44.entities.HomepageFeatured.update(nextFeatured.id, {
          display_order: nextFeatured.display_order - 1
        });
      }

      loadData();
    } catch (error) {
      toast({
        title: "Failed to reorder",
        variant: "destructive"
      });
    }
  };

  const getProductDetails = (productId) => {
    return allProducts.find(p => p.id === productId);
  };

  const availableProducts = allProducts.filter(p => 
    !featuredProducts.some(f => f.product_id === p.id)
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Homepage Featured Products</h2>
          <p className="text-cyan-400">
            Select up to 10 products to feature in the homepage background slideshow ({featuredProducts.length}/10)
          </p>
        </div>
        {featuredProducts.length < 10 && (
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-cyan-600 hover:bg-cyan-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        )}
      </div>

      <Card className="bg-slate-800 border-cyan-500/30">
        <CardHeader>
          <CardTitle className="text-white">Featured Products</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            </div>
          ) : featuredProducts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400 mb-4">No products featured on homepage yet</p>
              <Button
                onClick={() => setShowAddDialog(true)}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                Add First Product
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {featuredProducts.map((featured, index) => {
                const product = getProductDetails(featured.product_id);
                if (!product) return null;

                return (
                  <div
                    key={featured.id}
                    className="flex items-center gap-4 p-4 bg-slate-900 rounded-lg border border-slate-700"
                  >
                    <div className="text-2xl font-bold text-cyan-400 w-8">
                      #{featured.display_order}
                    </div>
                    
                    {product.images && product.images[0] && (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-20 h-20 object-cover rounded"
                      />
                    )}
                    
                    <div className="flex-1">
                      <h3 className="font-semibold text-white">{product.name}</h3>
                      <p className="text-sm text-slate-400">${product.price.toFixed(2)}</p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMoveUp(featured)}
                        disabled={index === 0}
                        className="bg-slate-700 text-white border-slate-600"
                      >
                        <MoveUp className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMoveDown(featured)}
                        disabled={index === featuredProducts.length - 1}
                        className="bg-slate-700 text-white border-slate-600"
                      >
                        <MoveDown className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemove(featured.id)}
                        className="bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Product Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-slate-800 border-cyan-500/30 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Add Product to Homepage</DialogTitle>
            <DialogDescription className="text-slate-400">
              Select a product to feature in the homepage background slideshow
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                <SelectValue placeholder="Select a product..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {availableProducts.map(product => (
                  <SelectItem 
                    key={product.id} 
                    value={product.id}
                    className="text-white hover:bg-slate-700"
                  >
                    {product.name} - ${product.price.toFixed(2)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
              className="bg-slate-700 text-white border-slate-600"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              Add Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}