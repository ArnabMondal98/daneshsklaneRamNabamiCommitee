"use client";

import React from 'react';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Share2, ImageIcon, ArrowRight, Loader2 } from 'lucide-react';
import { useLanguage } from '@/lib/i18n-context';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, where, limit } from 'firebase/firestore';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';
import { useToast } from '@/hooks/use-toast';

export function WorksSection() {
  const { t, language } = useLanguage();
  const db = useFirestore();
  const { toast } = useToast();

  const worksQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, 'works'), 
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc'), 
      limit(10)
    );
  }, [db]);

  const { data: works, loading } = useCollection(worksQuery);

  const handleShare = async (title: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          url: window.location.href,
        });
      } catch (err) {}
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link Copied!" });
    }
  };

  if (loading) return (
    <div className="py-24 flex justify-center items-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <section id="works" className="py-24 bg-[#1A1A1A]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div className="space-y-4">
            <h2 className="text-4xl md:text-6xl font-headline font-black text-white uppercase leading-none">
              {t('work_title')}
            </h2>
            <div className="w-24 h-1.5 bg-primary" />
          </div>
          <p className="text-muted-foreground max-w-md text-right hidden md:block uppercase tracking-widest text-[10px] font-bold opacity-60">
            Real-time updates on our community initiatives
          </p>
        </div>

        {works && works.length > 0 ? (
          <div className="relative">
            <Carousel 
              opts={{ loop: true, align: 'start' }}
              plugins={[Autoplay({ delay: 5000, stopOnInteraction: true })]}
              className="w-full"
            >
              <CarouselContent className="-ml-6">
                {works.map((work) => {
                  const title = language === 'bn' ? work.title_bn : (work.title_en || work.title_bn);
                  const description = language === 'bn' ? work.description_bn : (work.description_en || work.description_bn);
                  const location = language === 'bn' ? work.location_bn : (work.location_en || work.location_bn);
                  
                  return (
                    <CarouselItem key={work.id} className="pl-6 md:basis-1/2 lg:basis-1/3">
                      <Card className="bg-card/50 border-white/5 overflow-hidden group hover:border-primary/40 transition-all duration-500 rounded-none h-full flex flex-col shadow-2xl">
                        <div className="relative aspect-video overflow-hidden">
                          <Image 
                            src={work.image || 'https://picsum.photos/seed/work/800/600'} 
                            alt={title}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-1000"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-60" />
                          <div className="absolute bottom-4 left-4 flex gap-2">
                             <Badge className="bg-black/50 backdrop-blur-md text-white border-none text-[8px] font-bold uppercase tracking-widest">
                               {work.date || 'RECENT'}
                             </Badge>
                          </div>
                          <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full" onClick={() => handleShare(title)}>
                               <Share2 className="w-3.5 h-3.5" />
                             </Button>
                          </div>
                        </div>
                        <div className="p-8 space-y-4 flex-1 flex flex-col">
                          <h3 className="text-xl font-headline font-bold text-white leading-tight group-hover:text-primary transition-colors bn-font line-clamp-2 min-h-[3.2em]">
                            {title}
                          </h3>
                          <p className="text-xs text-muted-foreground bn-font line-clamp-3 flex-1 opacity-70">
                            {description}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-primary/80 uppercase font-bold tracking-widest">
                            <MapPin className="w-3 h-3" /> {location}
                          </div>
                          <div className="grid grid-cols-2 gap-2 pt-6">
                            <Button variant="outline" size="sm" className="rounded-none border-white/10 hover:bg-primary/10 gap-2 text-[9px] font-black uppercase tracking-widest">
                              <ImageIcon className="w-3.5 h-3.5" /> GALLERY
                            </Button>
                            <Button className="rounded-none bg-primary hover:bg-primary/90 text-[9px] font-black uppercase tracking-widest group">
                              DETAILS <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </CarouselItem>
                  );
                })}
              </CarouselContent>
              <div className="flex justify-end gap-2 mt-8">
                 <CarouselPrevious className="static translate-y-0 h-10 w-10 border-white/10 hover:bg-primary" />
                 <CarouselNext className="static translate-y-0 h-10 w-10 border-white/10 hover:bg-primary" />
              </div>
            </Carousel>
          </div>
        ) : (
          <div className="p-20 text-center border border-dashed border-white/10 bg-white/[0.02]">
            <p className="text-muted-foreground bn-font opacity-60 text-lg">
              {language === 'bn' ? 'বর্তমানে কোনো কাজের আপডেট নেই' : 'No work updates available'}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}