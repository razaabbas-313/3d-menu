package com.atelierar.analytics;

public enum EventType {
    /** A guest opened the public menu. */
    SCAN,
    /** A guest opened a dish. */
    ITEM_VIEW,
    /** A 3D model finished loading for a guest. */
    MODEL_VIEW,
    /** A guest tapped "View on your table". */
    AR_LAUNCH
}
