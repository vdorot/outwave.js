
    CFLAGS=-std=c99 -Wall -pedantic -g
    LDFLAGS = -lm
    BIN=outwave
    CC=gcc
    FILES=
    MAIN=main.o

    LIBSNDFILE=libsndfile/src/.libs/libsndfile.a

    OBJS=$(FILES) $(MAIN)
 

    .PHONY: all
    all: $(LIBSNDFILE) $(OBJS)
	    $(CC) $(CFLAGS) -o $(BIN) $(OBJS) $(LIBSNDFILE) $(LDFLAGS)

    libsndfile/src/.libs/libsndfile.a:
	    cd libsndfile && ./configure --enable-static --disable-external-libs && make

    .PHONY: clean
    clean:
	    rm -f *.o $(BIN) && cd libsndfile && make clean