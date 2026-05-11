import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getProductSlugs, getProductBySlug } from '@/lib/db/products'
import { ProductDetailClient } from './ProductDetailClient'
import { BRAND } from '@/lib/constants'
export const revalidate = 30
export const dynamicParams = true

export async function generateStaticParams() {
  const slugs = await getProductSlugs()
  return slugs.map((slug) => ({ slug }))
}

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) return {}
  return {
    title: product.name,
    description: product.description ?? `${product.name} — ${BRAND.name}`,
    openGraph: {
      title: product.name,
      images: product.images[0] ? [product.images[0]] : [],
    },
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) notFound()

  return <ProductDetailClient product={product} />
}
