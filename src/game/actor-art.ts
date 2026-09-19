import type {GuestId} from './guests.ts';
import type {Outfit} from './visuals.ts';
import type {CompanionId} from './companions.ts';
import type {ActionAtlas} from '../client/world/actor-atlas.ts';

export const GUEST_ACTION_ART:Record<GuestId,Record<Outfit,ActionAtlas>>={
  "G001": {
    "base": {
      "file": "g001-base-actions-v1.png",
      "size": [
        1254,
        1254
      ],
      "frames": [
        [
          229,
          25,
          297,
          600
        ],
        [
          722,
          21,
          302,
          604
        ],
        [
          196,
          659,
          313,
          554
        ],
        [
          717,
          637,
          373,
          589
        ]
      ],
      "referenceHeight": 604,
      "seatLift": -0.02,
      "mirrored": [
        1
      ]
    },
    "alternate": {
      "file": "g001-alternate-actions-v1.png",
      "size": [
        1254,
        1254
      ],
      "frames": [
        [
          146,
          15,
          340,
          613
        ],
        [
          741,
          22,
          359,
          606
        ],
        [
          160,
          650,
          361,
          572
        ],
        [
          723,
          655,
          456,
          558
        ]
      ],
      "referenceHeight": 613,
      "seatLift": 0
    }
  },
  "G002": {
    "base": {
      "file": "g002-base-actions-v1.png",
      "size": [
        1254,
        1254
      ],
      "frames": [
        [
          195,
          18,
          343,
          630
        ],
        [
          764,
          18,
          348,
          636
        ],
        [
          135,
          705,
          437,
          525
        ],
        [
          705,
          667,
          448,
          574
        ]
      ],
      "referenceHeight": 636,
      "seatLift": 0.36
    },
    "alternate": {
      "file": "g002-alternate-actions-v1.png",
      "size": [
        1254,
        1254
      ],
      "frames": [
        [
          156,
          10,
          377,
          629
        ],
        [
          766,
          11,
          370,
          628
        ],
        [
          154,
          651,
          407,
          558
        ],
        [
          748,
          671,
          386,
          538
        ]
      ],
      "referenceHeight": 629,
      "seatLift": -0.04
    }
  },
  "G003": {
    "base": {
      "file": "g003-base-actions-v1.png",
      "size": [
        1254,
        1254
      ],
      "frames": [
        [
          162,
          87,
          362,
          520
        ],
        [
          734,
          88,
          364,
          519
        ],
        [
          145,
          700,
          387,
          474
        ],
        [
          711,
          705,
          439,
          471
        ]
      ],
      "referenceHeight": 520,
      "seatLift": 0.32
    },
    "alternate": {
      "file": "g003-alternate-actions-v1.png",
      "size": [
        1254,
        1254
      ],
      "frames": [
        [
          123,
          56,
          411,
          601
        ],
        [
          730,
          58,
          410,
          601
        ],
        [
          129,
          707,
          393,
          499
        ],
        [
          731,
          702,
          409,
          526
        ]
      ],
      "referenceHeight": 601,
      "seatLift": 0.34
    }
  },
  "G004": {
    "base": {
      "file": "g004-base-actions-v1.png",
      "size": [
        1254,
        1254
      ],
      "frames": [
        [
          179,
          33,
          356,
          599
        ],
        [
          760,
          39,
          332,
          594
        ],
        [
          141,
          724,
          434,
          482
        ],
        [
          725,
          660,
          396,
          560
        ]
      ],
      "referenceHeight": 599,
      "seatLift": 0.36
    },
    "alternate": {
      "file": "g004-alternate-actions-v1.png",
      "size": [
        1254,
        1254
      ],
      "frames": [
        [
          154,
          30,
          380,
          593
        ],
        [
          724,
          31,
          366,
          599
        ],
        [
          184,
          641,
          353,
          564
        ],
        [
          725,
          641,
          393,
          588
        ]
      ],
      "referenceHeight": 599,
      "seatLift": 0
    }
  }
};
export const COMPANION_ACTION_ART:Record<CompanionId,ActionAtlas>={
  "A002": {
    "file": "a002-actions-v1.png",
    "size": [
      1254,
      1254
    ],
    "frames": [
      [
        57,
        136,
        556,
        438
      ],
      [
        675,
        138,
        560,
        441
      ],
      [
        55,
        708,
        549,
        437
      ],
      [
        695,
        680,
        491,
        470
      ]
    ],
    "referenceHeight": 441,
    "seatLift": 0
  },
  "A004": {
    "file": "a004-actions-v1.png",
    "size": [
      1254,
      1254
    ],
    "frames": [
      [
        133,
        22,
        401,
        585
      ],
      [
        752,
        22,
        398,
        582
      ],
      [
        116,
        639,
        460,
        553
      ],
      [
        745,
        668,
        406,
        550
      ]
    ],
    "referenceHeight": 585,
    "seatLift": 0
  },
  "A013": {
    "file": "a013-actions-v1.png",
    "size": [
      1254,
      1254
    ],
    "frames": [
      [
        141,
        60,
        409,
        549
      ],
      [
        780,
        60,
        389,
        549
      ],
      [
        146,
        740,
        408,
        464
      ],
      [
        779,
        645,
        370,
        542
      ]
    ],
    "referenceHeight": 549,
    "seatLift": 0
  }
};
