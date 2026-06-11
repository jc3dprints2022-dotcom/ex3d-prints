import { useEffect, useRef, useCallback } from 'react';
import { posthog } from '@/lib/posthog';

/**
 * Reusable hook for all listing/product pages.
 * Handles: page view, scroll depth, time on page, exit tracking.
 *
 * @param {object} listing - { id, title, category, price, designer_id, designer_name, tags }
 */
export function useListingAnalytics(listing) {
  const scrollMilestonesHit = useRef(new Set());
  const timeThresholdsHit = useRef(new Set());
  const pageEnterTime = useRef(Date.now());
  const lastScrollDepth = useRef(0);
  const lastInteraction = useRef(null);
  const addedToCart = useRef(false);

  const deviceType = typeof window !== 'undefined'
    ? (window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop')
    : 'unknown';

  const getUtm = () => {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get('utm_source') || posthog.get_property('utm_source') || null,
      utm_medium: params.get('utm_medium') || posthog.get_property('utm_medium') || null,
      utm_campaign: params.get('utm_campaign') || posthog.get_property('utm_campaign') || null,
      utm_content: params.get('utm_content') || posthog.get_property('utm_content') || null,
      referrer: posthog.get_property('referrer') || document.referrer || null,
    };
  };

  const baseProps = useCallback(() => ({
    listing_id: listing?.id,
    listing_title: listing?.title || listing?.name,
    category: listing?.category,
    price: listing?.price,
    designer_id: listing?.designer_id || listing?.seller_id,
    designer_name: listing?.designer_name,
    tags: listing?.tags,
    device_type: deviceType,
    ...getUtm(),
  }), [listing, deviceType]);

  // ── Fire listing_viewed on mount ──
  useEffect(() => {
    if (!listing?.id) return;
    posthog.capture('listing_viewed', baseProps());
  }, [listing?.id]);

  // ── Scroll depth tracking ──
  useEffect(() => {
    if (!listing?.id) return;

    const MILESTONES = [25, 50, 75, 90, 100];

    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;

      const pct = Math.min(100, Math.round((scrollTop / docHeight) * 100));
      lastScrollDepth.current = pct;

      MILESTONES.forEach(milestone => {
        if (pct >= milestone && !scrollMilestonesHit.current.has(milestone)) {
          scrollMilestonesHit.current.add(milestone);
          posthog.capture('listing_scroll_depth', {
            ...baseProps(),
            scroll_percent: milestone,
          });
        }
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [listing?.id, baseProps]);

  // ── Time on page tracking ──
  useEffect(() => {
    if (!listing?.id) return;

    const TIME_THRESHOLDS = [10, 30, 60, 120];

    const timers = TIME_THRESHOLDS.map(seconds => {
      return setTimeout(() => {
        if (!timeThresholdsHit.current.has(seconds)) {
          timeThresholdsHit.current.add(seconds);
          posthog.capture('listing_time_on_page', {
            ...baseProps(),
            seconds_on_page: seconds,
          });
        }
      }, seconds * 1000);
    });

    return () => timers.forEach(clearTimeout);
  }, [listing?.id, baseProps]);

  // ── Exit / page leave tracking ──
  useEffect(() => {
    if (!listing?.id) return;

    const onBeforeUnload = () => {
      const timeSpent = Math.round((Date.now() - pageEnterTime.current) / 1000);
      posthog.capture('listing_exit', {
        ...baseProps(),
        time_on_page_seconds: timeSpent,
        last_scroll_depth: lastScrollDepth.current,
        last_interaction: lastInteraction.current,
        added_to_cart: addedToCart.current,
      });
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [listing?.id, baseProps]);

  // ── Public tracker functions ──

  const trackButtonClick = useCallback((buttonName, extra = {}) => {
    lastInteraction.current = buttonName;
    posthog.capture('listing_button_clicked', {
      ...baseProps(),
      button_name: buttonName,
      ...extra,
    });
  }, [baseProps]);

  const trackAddToCart = useCallback((extra = {}) => {
    addedToCart.current = true;
    lastInteraction.current = 'add_to_cart';
    posthog.capture('listing_add_to_cart', {
      ...baseProps(),
      ...extra,
    });
  }, [baseProps]);

  const trackCheckoutStarted = useCallback((extra = {}) => {
    lastInteraction.current = 'checkout_started';
    posthog.capture('listing_checkout_started', {
      ...baseProps(),
      ...extra,
    });
  }, [baseProps]);

  const trackImageInteraction = useCallback((interactionType, imageIndex = 0, extra = {}) => {
    lastInteraction.current = `image_${interactionType}`;
    posthog.capture('listing_image_interaction', {
      ...baseProps(),
      interaction_type: interactionType,
      image_index: imageIndex,
      ...extra,
    });
  }, [baseProps]);

  const trackRelatedListingClick = useCallback((targetListingId, targetTitle, section = 'related') => {
    posthog.capture('listing_related_click', {
      ...baseProps(),
      target_listing_id: targetListingId,
      target_listing_title: targetTitle,
      section,
    });
  }, [baseProps]);

  return {
    trackButtonClick,
    trackAddToCart,
    trackCheckoutStarted,
    trackImageInteraction,
    trackRelatedListingClick,
  };
}