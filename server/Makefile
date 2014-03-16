
    CFLAGS=-std=c99 -Wall -pedantic -g
    LDFLAGS = -lm
    BIN=outwave
    CC=gcc

    MAIN=main.o

    OBJS=$(FILES) $(MAIN) libsndfile/src/.libs/libsndfile.a
 

    .PHONY: all
    all: clean $(OBJS)
	    $(CC) $(CFLAGS) -o $(BIN) $(OBJS) $(LDFLAGS)

    libsndfile/src/.libs/libsndfile.a:
	    cd libsndfile && ./configure --enable-static --disable-external-libs && make

    .PHONY: clean
    clean:
	    rm -f *.o $(BIN) && cd libsndfile && make clean