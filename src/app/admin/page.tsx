"use client";

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/lib/i18n-context';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  Wand2, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  UserPlus, 
  Search, 
  Zap, 
  Briefcase, 
  Calendar, 
  Newspaper, 
  Image as ImageIcon, 
  Upload,
  LayoutDashboard,
  RefreshCw,
  Video,
  Database,
  CheckCircle2
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useFirebaseApp } from '@/firebase';
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  updateDoc, 
  doc, 
  serverTimestamp, 
  query, 
  orderBy, 
  where, 
  getDocs, 
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import Image from 'next/image';
import { enhanceContent } from '@/ai/flows/admin-content-enhancer';
import { adminContentTranslator } from '@/ai/flows/admin-content-translator';

// --- Media Upload Component ---
const MediaUploader = ({ path, onUploadComplete, label, accept = "image/*", multiple = false }: any) => {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const app = useFirebaseApp();
  const storage = getStorage(app);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const urls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      await new Promise((resolve, reject) => {
        uploadTask.on('state_changed', 
          (snapshot) => {
            const pct = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setProgress(Math.round(pct));
          },
          (error) => {
            console.error("Upload failed", error);
            reject(error);
          },
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            urls.push(url);
            resolve(url);
          }
        );
      });
    }

    setUploading(false);
    setProgress(0);
    onUploadComplete(multiple ? urls : urls[0]);
  };

  return (
    <div className="space-y-2">
      <Label className="text-[10px] uppercase tracking-widest font-bold opacity-60">{label}</Label>
      <div className="relative">
        <Input 
          type="file" 
          accept={accept} 
          multiple={multiple} 
          onChange={handleUpload}
          className="cursor-pointer bg-background/50 border-dashed border-white/20" 
        />
        {uploading && (
          <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center rounded-md">
            <span className="text-[10px] font-bold mb-1">{progress}%</span>
            <Progress value={progress} className="w-1/2 h-1" />
          </div>
        )}
      </div>
    </div>
  );
};

export default function AdminPage() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const db = useFirestore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Shared AI Editor State
  const [editorContent, setEditorContent] = useState('');
  const [editorLoading, setEditorLoading] = useState(false);

  // ENTITY: WORKS
  const [workEditingId, setWorkEditingId] = useState<string | null>(null);
  const [workForm, setWorkForm] = useState({
    title_bn: '', title_en: '', description_bn: '', description_en: '',
    location_bn: '', location_en: '', image: '', status: 'active' as 'active' | 'completed',
    featured: false, date: '', video: '', gallery: [] as string[]
  });
  const [workSubmitting, setWorkSubmitting] = useState(false);

  // FIREBASE HOOKS
  const worksQuery = useMemoFirebase(() => db ? query(collection(db, 'works'), orderBy('createdAt', 'desc')) : null, [db]);
  const { data: worksItems, loading: worksLoading } = useCollection(worksQuery);

  const handleSaveWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;
    setWorkSubmitting(true);
    const data = { 
      ...workForm, 
      updatedAt: serverTimestamp(),
      image: workForm.image || 'https://picsum.photos/seed/work/800/600'
    };
    try {
      if (workEditingId) {
        await updateDoc(doc(db, 'works', workEditingId), data);
        toast({ title: "Work Updated" });
      } else {
        await addDoc(collection(db, 'works'), { ...data, createdAt: serverTimestamp() });
        toast({ title: "Work Created" });
      }
      resetWorkForm();
    } catch (err) { 
      toast({ variant: "destructive", title: "Save Error" }); 
    }
    finally { setWorkSubmitting(false); }
  };

  const resetWorkForm = () => {
    setWorkEditingId(null);
    setWorkForm({ 
      title_bn: '', title_en: '', description_bn: '', description_en: '', 
      location_bn: '', location_en: '', image: '', status: 'active', 
      featured: false, date: '', video: '', gallery: [] 
    });
  };

  const seedOfficialWorks = async () => {
    if (!db) return;
    setWorkSubmitting(true);
    const batch = writeBatch(db);
    
    const officialWorks = [
      {
        title_en: "Community Playground Cleared Successfully",
        title_bn: "কমিউনিটি খেলার মাঠ পরিষ্কার সফলভাবে সম্পন্ন",
        description_en: "Community playground cleared successfully in Danesh Sheikh Lane, 41 No Ward of Dakshin Howrah. The area was cleared using heavy machinery to provide children and youth a safe open space.",
        description_bn: "দানেশ শেখ লেন, দক্ষিণ হাওড়ার ৪১ নং ওয়ার্ডে কমিউনিটি খেলার মাঠ সফলভাবে পরিষ্কার করা হয়েছে। শিশু ও যুবকদের নিরাপদ খোলা জায়গা দেওয়ার জন্য ভারী যন্ত্র ব্যবহার করা হয়েছে।",
        location_en: "Danesh Sheikh Lane, Ward 41",
        location_bn: "দানেশ শেখ লেন, ৪১ নং ওয়ার্ড",
        image: "https://picsum.photos/seed/playground/800/600",
        featured: true, status: "active", date: "2026-05-15"
      },
      {
        title_en: "Underground Drainage Repair Completed at Ward No.39",
        title_bn: "৩৯ নং ওয়ার্ডে আন্ডারগ্রাউন্ড ড্রেনেজ মেরামত সম্পন্ন",
        description_en: "Underground drainage repair work was successfully completed on 19 May 2026 at Godown Gate area under Ward No.39, Dakshin Howrah.",
        description_bn: "দক্ষিণ হাওড়ার ৩৯ নং ওয়ার্ডের গোডাউন গেট এলাকায় ১৯ মে ২০২৬ আন্ডারগ্রাউন্ড ড্রেনেজ মেরামতের কাজ সফলভাবে সম্পন্ন হয়েছে।",
        location_en: "Godown Gate, Ward 39",
        location_bn: "গোডাউন গেট, ৩৯ নং ওয়ার্ড",
        image: "https://picsum.photos/seed/drainage/800/600",
        featured: true, status: "active", date: "2026-05-19"
      },
      {
        title_en: "Development Work Completed at Lalkuti Tetultala Ward No.41",
        title_bn: "লালকুঠি তেঁতুলতলায় উন্নয়নমূলক কাজ সম্পন্ন",
        description_en: "Development work completed successfully at Lalkuti Tetultala.",
        description_bn: "লালকুঠি তেঁতুলতলায় উন্নয়নমূলক কাজ সফলভাবে সম্পন্ন হয়েছে।",
        location_en: "Lalkuti Tetultala",
        location_bn: "লালকুঠি তেঁতুলতলা",
        image: "https://picsum.photos/seed/development/800/600",
        featured: true, status: "active", date: "2026-05-22"
      },
      {
        title_en: "Garbage Clearance at 42 No Bus Stand",
        title_bn: "৪২ নম্বর বাস স্ট্যান্ড এলাকায় আবর্জনা পরিষ্কার",
        description_en: "Garbage clearance work completed at Danesh Sheikh Lane.",
        description_bn: "দানেশ শেখ লেনের ৪২ নম্বর বাস স্ট্যান্ড এলাকায় আবর্জনা পরিষ্কার কাজ সম্পন্ন হয়েছে।",
        location_en: "42 No Bus Stand",
        location_bn: "৪২ নম্বর বাস স্ট্যান্ড",
        image: "https://picsum.photos/seed/garbage/800/600",
        featured: true, status: "active", date: "2026-05-24"
      },
      {
        title_en: "Free Health Checkup Camp",
        title_bn: "বিনামূল্যে স্বাস্থ্য পরীক্ষা শিবির",
        description_en: "A free health checkup camp was organized near Danesh Sheikh Lane.",
        description_bn: "দানেশ শেখ লেন এলাকায় বিনামূল্যে স্বাস্থ্য পরীক্ষা শিবির আয়োজন করা হয়েছে।",
        location_en: "Danesh Sheikh Lane",
        location_bn: "দানেশ শেখ লেন",
        image: "https://picsum.photos/seed/health/800/600",
        featured: true, status: "active", date: "2026-05-25"
      }
    ];

    try {
      for (const work of officialWorks) {
        const q = query(collection(db, 'works'), where('title_bn', '==', work.title_bn));
        const snap = await getDocs(q);
        if (snap.empty) {
          const ref = doc(collection(db, 'works'));
          batch.set(ref, {
            ...work,
            gallery: [],
            video: '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      }
      await batch.commit();
      toast({ title: "Official Works Seeded" });
    } catch (err) { 
      console.error(err);
      toast({ variant: "destructive", title: "Seeding Error" }); 
    }
    finally { setWorkSubmitting(false); }
  };

  if (!isMounted) return null;

  return (
    <main className="min-h-screen pt-24 bg-[#0F0F0F]">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 pb-20">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
                <LayoutDashboard className="w-6 h-6" />
             </div>
             <div>
                <h1 className="text-3xl font-headline font-bold text-white uppercase tracking-tight">Media & Content</h1>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold opacity-60">Control Panel</p>
             </div>
          </div>
          <div className="flex gap-4">
             <Button variant="outline" onClick={seedOfficialWorks} className="border-white/10 text-white gap-2 hover:bg-white/5 uppercase text-[10px] font-black tracking-widest">
                <Database className="w-3.5 h-3.5" /> Seed Official Works
             </Button>
          </div>
        </header>

        <Tabs defaultValue="works" className="space-y-8">
          <TabsList className="bg-card/30 border border-white/5 p-1.5 rounded-2xl backdrop-blur-xl overflow-x-auto flex-nowrap">
            <TabsTrigger value="works" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-white">Works</TabsTrigger>
            <TabsTrigger value="events" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-white">Events</TabsTrigger>
            <TabsTrigger value="news" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-white">News</TabsTrigger>
            <TabsTrigger value="gallery" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-white">Gallery</TabsTrigger>
            <TabsTrigger value="ai" className="px-6 data-[state=active]:bg-accent data-[state=active]:text-white">AI Tools</TabsTrigger>
          </TabsList>

          {/* WORKS MANAGER */}
          <TabsContent value="works" className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card className="bg-card border-white/5 h-fit lg:sticky lg:top-24 shadow-2xl">
                <CardHeader>
                  <CardTitle className="text-primary flex items-center gap-2 uppercase tracking-tighter">
                    <Briefcase className="w-5 h-5" />
                    {workEditingId ? 'Edit Work' : 'Add Work'}
                  </CardTitle>
                </CardHeader>
                <form onSubmit={handleSaveWork}>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <Label className="text-[10px] uppercase tracking-widest font-bold opacity-60">BN Title</Label>
                          <Input value={workForm.title_bn} onChange={e => setWorkForm({...workForm, title_bn: e.target.value})} required className="bg-background bn-font" />
                       </div>
                       <div className="space-y-2">
                          <Label className="text-[10px] uppercase tracking-widest font-bold opacity-60">EN Title</Label>
                          <Input value={workForm.title_en} onChange={e => setWorkForm({...workForm, title_en: e.target.value})} className="bg-background" />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <Label className="text-[10px] uppercase tracking-widest font-bold opacity-60">Description (BN)</Label>
                       <Textarea value={workForm.description_bn} onChange={e => setWorkForm({...workForm, description_bn: e.target.value})} required className="bg-background bn-font min-h-[80px]" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <MediaUploader 
                          path="works/covers" 
                          label="Cover Image" 
                          onUploadComplete={(url: string) => setWorkForm({...workForm, image: url})} 
                        />
                       <MediaUploader 
                          path="works/videos" 
                          label="Promo Video" 
                          accept="video/*"
                          onUploadComplete={(url: string) => setWorkForm({...workForm, video: url})} 
                        />
                    </div>
                    <MediaUploader 
                        path="works/gallery" 
                        label="Add to Gallery" 
                        multiple={true}
                        onUploadComplete={(urls: string[]) => setWorkForm({...workForm, gallery: [...workForm.gallery, ...urls]})} 
                    />
                    {workForm.gallery.length > 0 && (
                      <div className="grid grid-cols-5 gap-2 pt-2">
                        {workForm.gallery.map((url, i) => (
                          <div key={i} className="relative aspect-square border border-white/10 rounded overflow-hidden">
                            <Image src={url} alt="" fill className="object-cover" />
                            <button 
                              type="button" 
                              onClick={() => setWorkForm({...workForm, gallery: workForm.gallery.filter((_, idx) => idx !== i)})}
                              className="absolute top-0 right-0 bg-red-500 p-0.5"
                            >
                              <X className="w-2 h-2 text-white" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                       <div className="flex items-center gap-2">
                          <Switch 
                            checked={workForm.featured} 
                            onCheckedChange={v => setWorkForm({...workForm, featured: v})} 
                          />
                          <Label className="text-[10px] uppercase font-bold tracking-widest">Featured</Label>
                       </div>
                       <select 
                          value={workForm.status} 
                          onChange={(e) => setWorkForm({...workForm, status: e.target.value as 'active' | 'completed'})}
                          className="bg-background border border-white/10 rounded h-8 text-[10px] uppercase font-bold px-2 text-white"
                       >
                          <option value="active">Active</option>
                          <option value="completed">Completed</option>
                       </select>
                    </div>
                  </CardContent>
                  <CardFooter className="flex gap-2">
                    <Button type="submit" className="flex-1 bg-primary font-black uppercase tracking-widest text-[10px]" disabled={workSubmitting}>
                      {workSubmitting ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                      {workEditingId ? 'UPDATE' : 'SAVE'}
                    </Button>
                    {workEditingId && <Button variant="ghost" onClick={resetWorkForm} size="icon"><X className="w-4 h-4" /></Button>}
                  </CardFooter>
                </form>
              </Card>

              <div className="lg:col-span-2 space-y-4">
                {worksLoading ? (
                  <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>
                ) : worksItems?.map(item => (
                  <Card key={item.id} className="bg-card/50 border-white/5 p-4 flex gap-6 group">
                    <div className="relative w-32 h-20 shrink-0">
                      <Image src={item.image || 'https://picsum.photos/seed/work/400/300'} alt="" fill className="object-cover rounded-lg" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-primary/20 text-primary border-none text-[8px]">{item.status}</Badge>
                        {item.featured && <CheckCircle2 className="w-3 h-3 text-accent" />}
                      </div>
                      <h3 className="font-bold text-white bn-font text-sm">{item.title_bn}</h3>
                      <div className="flex gap-4 mt-3">
                        <Button size="sm" variant="ghost" className="h-7 text-[9px] font-bold uppercase tracking-widest" onClick={() => {
                          setWorkEditingId(item.id);
                          setWorkForm({ ...item });
                        }}><Edit2 className="w-3 h-3 mr-2" /> Edit</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-[9px] font-bold uppercase tracking-widest text-destructive" onClick={() => deleteDoc(doc(db!, 'works', item.id))}>Delete</Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* OTHER MANAGERS */}
          <TabsContent value="events" className="p-12 text-center text-white/40">Events Manager UI coming soon...</TabsContent>
          <TabsContent value="news" className="p-12 text-center text-white/40">News Manager UI coming soon...</TabsContent>
          <TabsContent value="gallery" className="p-12 text-center text-white/40">Gallery Manager UI coming soon...</TabsContent>
          
          <TabsContent value="ai">
            <Card className="bg-card border-white/5 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-accent flex items-center gap-2 uppercase tracking-tighter"><Wand2 className="w-5 h-5" /> Content Engine</CardTitle>
                <CardDescription>Use AI to enhance or translate your site content.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Textarea 
                   className="min-h-[300px] bg-background/50 border-white/10 bn-font p-6 text-xl text-white" 
                   placeholder="Type your content..."
                   value={editorContent} 
                   onChange={e => setEditorContent(e.target.value)} 
                />
                <div className="flex flex-wrap gap-4">
                  <Button variant="secondary" onClick={handleEnhance} disabled={editorLoading} className="h-12 px-8 font-black uppercase tracking-widest text-[10px]">
                    {editorLoading ? <Loader2 className="animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                    Improve
                  </Button>
                  <Button variant="outline" onClick={() => handleTranslate('en')} disabled={editorLoading} className="h-12 px-8 font-black uppercase tracking-widest text-[10px]">
                    to English
                  </Button>
                  <Button variant="outline" onClick={() => handleTranslate('bn')} disabled={editorLoading} className="h-12 px-8 font-black uppercase tracking-widest text-[10px]">
                    to Bengali
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );

  async function handleEnhance() {
    if (!editorContent) return;
    setEditorLoading(true);
    try {
      const result = await enhanceContent({ content: editorContent });
      setEditorContent(result.enhancedContent);
      toast({ title: "Content Enhanced" });
    } catch (err) { toast({ variant: "destructive", title: "AI Error" }); }
    finally { setEditorLoading(false); }
  }

  async function handleTranslate(target: 'en' | 'bn') {
    if (!editorContent) return;
    setEditorLoading(true);
    try {
      const result = await adminContentTranslator({ textToTranslate: editorContent, targetLanguage: target });
      setEditorContent(result.translatedText);
      toast({ title: "Translated" });
    } catch (err) { toast({ variant: "destructive", title: "AI Error" }); }
    finally { setEditorLoading(false); }
  }
}
