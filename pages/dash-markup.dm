@page - title Dash --- Markup ---- -
    main -
        h1 -- Dash Markup --
        h2 -- Introduction --
        ol - start 0 -
            li -
                p -
                    “Dash” refers to the ASCII glyph
                    code -- 0x2d --
                    code -- - --
                    , which is also called “hyphen” or “minus” in various context.
                -
            -
            li -
                p -
                    Dash Markup is
                    i -- line of text that ends with dash: --
                -
                pre -- Dash - Markup -- --
            -
            li -
                p -
                    Dash Markup is designed for
                    i -- typing & parsing with ease. --
                -
                p -- For example, it can translate to (partial) XML: --
                pre -- <Dash Markup /> --
                p -- That said, you may use & extend it for anything suitable in your mind. --
            -
            li -
                p -- Let’s define: --
                ul -
                    li -
                        “
                        code -- - --
                        ” is a
                        i -- single dash, --
                    -
                    li -
                        “
                        code -- -- --
                        ” is a
                        i -- double dash, --
                        and
                    -
                    li -
                        other things between spaces are
                        i -- words. --
                    -
                -
            -
            li -
                p -- Note that, --
                ul -
                    li -- only dashes, spaces, and newlines are meaningful for Dash Markup syntax; --
                    li -- spaces around the dashes are strict; --
                    li -- indentations are treated as plain text; --
                    li -- in case regular dashes are wanted where dashes parsed as part of syntax, use more than 2 dashes; --
                    li -- Dash Markup should be reasonably loose: it shouldn’t blame one for trying out edge & undefined cases. --
                -
            -
        -
        p -- That’s all for Dash Markup itself. --
        h2 -- Example Use Case(s) --
        p -
            See an excellent use case:
            a - href dash-xml.html -- Dash XML. --
        -
    -
    footer -
        @footer-cc0 --
    -
-