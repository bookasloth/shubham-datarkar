import { buildMetadata, breadcrumbSchema } from "@/lib/seo";
import { Container, Section } from "@/components/layout/container";
import { PageHero } from "@/components/layout/page-hero";
import { CtaBand } from "@/components/sections/cta-band";
import { Reveal } from "@/components/motion/reveal";
import { JsonLd } from "@/components/seo/json-ld";

export const metadata = buildMetadata({
  title: "My Story",
  description: "From childhood curiosity to software products — how Shubham Datarkar moved from services to systems. The one thread: leverage.",
  path: "/my-story",
});

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[17px] leading-8 text-foreground/90">{children}</p>;
}

function Pull({ children }: { children: React.ReactNode }) {
  return (
    <blockquote className="border-l-2 border-foreground pl-5">
      <p className="font-display text-xl font-medium leading-snug tracking-tight">{children}</p>
    </blockquote>
  );
}

export default function MyStoryPage() {
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Home", path: "/" }, { name: "My Story", path: "/my-story" }])} />
      <PageHero
        eyebrow="My story"
        title="I am interested in leverage."
        description="How ideas spread. How systems compound. How structure creates freedom. The long version, from the beginning."
        crumbs={[{ label: "Home", href: "/" }, { label: "My Story" }]}
      />
      <Section>
        <Container size="prose">
          <Reveal className="flex flex-col gap-6">
            <P>
              I didn&rsquo;t grow up thinking I would build marketing systems or software products. I grew up curious.
            </P>
            <P>
              As a child, I was less interested in instructions and more interested in understanding how things worked.
              Why did some people command attention while others were ignored? Why did some ideas spread and others
              disappear? I didn&rsquo;t have the language for it then, but I was already studying leverage.
            </P>
            <P>
              <a
                href="https://nnawca.org/support-developers"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground underline underline-offset-4 transition-ui hover:text-muted-foreground"
              >
                School
              </a>{" "}
              sharpened that curiosity. I was drawn to words. Writing felt powerful. A sentence could change perception.
              A paragraph could shift emotion. I learned that communication wasn&rsquo;t decoration — it was influence.
            </P>
            <P>
              College expanded the canvas. While others were focused on marks and placements, I found myself drawn
              toward the internet. It felt like an open field. Anyone could build something. Anyone could publish.
              Anyone could test an idea in public.
            </P>
            <P>
              My early work began with writing. Copywriting. Blog posts. Social media content. Then writing led me to
              SEO. SEO led me to websites. Websites led me to funnels. Funnels led me to conversion strategy.
            </P>
            <Pull>Marketing wasn&rsquo;t about noise. It was about structure.</Pull>
            <P>
              I moved through roles — intern, copywriter, strategist, developer. I worked in agencies. I worked
              independently. I saw what worked and what broke.
            </P>
            <P>
              I also stepped away from digital life for a while and worked in agriculture. Farming changes you. You
              prepare soil before expecting harvest. You respect cycles. You learn patience.
            </P>
            <P>That experience stayed with me. It reshaped how I see business.</P>
            <Pull>Growth is not forced. It is designed.</Pull>
            <P>
              Over time, I stopped asking, &ldquo;How do we promote this?&rdquo; and started asking, &ldquo;How should
              this be built?&rdquo; That shift moved me from services to systems.
            </P>
            <P>
              Today, I operate across marketing infrastructure, software products, and long-form writing. I build
              ventures. I document thinking. I refine processes in public.
            </P>
            <P>
              Under my pen name, The Kalamwala, I explore ideas through essays and fiction — because writing remains the
              sharpest way I know to clarify thought.
            </P>
            <Pull>I don&rsquo;t chase trends. I build assets.</Pull>
            <P>Some experiments will scale. Some will fail. Both are useful.</P>
            <P>
              The thread connecting everything — from childhood curiosity to software products — is simple: I am
              interested in leverage. How ideas spread. How systems compound. How structure creates freedom.
            </P>
            <P>And I&rsquo;m still building.</P>
          </Reveal>
        </Container>
      </Section>
      <CtaBand />
    </>
  );
}
