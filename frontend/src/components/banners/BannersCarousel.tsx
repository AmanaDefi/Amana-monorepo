import React from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
import {UnderAuditBanner} from "@/components/banners/UnderAuditBanner";
import {MaximizeEarningsBanner} from "@/components/banners/MaximizeEarningsBanner";
import {UnderAudit2Banner} from "@/components/banners/UnderAudit2Banner";
import {EffortlessStakingBanner} from "@/components/banners/EffortlessStakingBanner";

export function BannersCarousel() {
    const [emblaRef] = useEmblaCarousel({
        loop: true,
        duration: 30,
    }, [
        Autoplay({
            delay: 5000,
            stopOnInteraction: false,
        })
    ])

    return (
        <div className="embla" ref={emblaRef}>
            <div className="embla__container">
                <div className="embla__slide">
                    <EffortlessStakingBanner/>
                </div>
                <div className="embla__slide">
                    <UnderAuditBanner/>
                </div>
                <div className="embla__slide">
                    <MaximizeEarningsBanner/>
                </div>
                <div className="embla__slide">
                    <UnderAudit2Banner/>
                </div>
            </div>
        </div>
    )
}
